#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

/// Escrow lifecycle. Terminal states (`Released`, `Refunded`) can never
/// transition again — `deposit` always creates a fresh id instead of
/// reusing a finalized one.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Locked,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub payer: Address,
    pub payee: Address,
    pub token: Address,
    pub amount: i128,
    pub status: EscrowStatus,
    /// Ledger sequence at/after which `refund` no longer requires the
    /// payer's authorization — anyone can trigger the refund once the
    /// escrow has timed out.
    pub timeout_ledger: u32,
}

#[contracttype]
enum DataKey {
    /// Monotonically increasing id counter, so escrow ids never collide.
    NextId,
    Escrow(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    NotFound = 1,
    AlreadyFinalized = 2,
    InvalidAmount = 3,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Locks `amount` of `token` into escrow, transferred from `payer` (who
    /// must authorize this call) into the contract itself. Returns the new
    /// escrow's id, used to `release` or `refund` it later.
    ///
    /// `timeout_ledgers` is how many ledgers from now the escrow stays
    /// payer-controlled before it becomes refundable by anyone — this is
    /// what makes funds recoverable even if the payee (or whoever would
    /// normally trigger `release`) disappears.
    pub fn deposit(
        env: Env,
        payer: Address,
        payee: Address,
        token: Address,
        amount: i128,
        timeout_ledgers: u32,
    ) -> Result<u64, EscrowError> {
        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }
        payer.require_auth();

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&payer, &env.current_contract_address(), &amount);

        let escrow_id = Self::next_id(&env);
        let escrow = Escrow {
            payer,
            payee,
            token,
            amount,
            status: EscrowStatus::Locked,
            timeout_ledger: env.ledger().sequence() + timeout_ledgers,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        Ok(escrow_id)
    }

    /// Pays out a locked escrow to its payee. Only the payer can authorize
    /// a release — this issue keeps the release condition simple and
    /// explicit (an authorized-caller decision, not an oracle or timelock);
    /// more sophisticated release conditions are a future issue.
    pub fn release(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        let mut escrow = Self::require_escrow(&env, escrow_id)?;
        if escrow.status != EscrowStatus::Locked {
            return Err(EscrowError::AlreadyFinalized);
        }
        escrow.payer.require_auth();

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.payee,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Released;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
    }

    /// Returns a locked escrow's funds to its payer. Before `timeout_ledger`
    /// this is an explicit cancellation and requires the payer's
    /// authorization; from `timeout_ledger` onward anyone may call it
    /// (no authorization required) so funds are never stuck if the payer
    /// goes silent.
    pub fn refund(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        let mut escrow = Self::require_escrow(&env, escrow_id)?;
        if escrow.status != EscrowStatus::Locked {
            return Err(EscrowError::AlreadyFinalized);
        }

        if env.ledger().sequence() < escrow.timeout_ledger {
            escrow.payer.require_auth();
        }

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.payer,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Refunded;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
    }

    /// Read-only lookup of an escrow's current state.
    pub fn get_escrow(env: Env, escrow_id: u64) -> Result<Escrow, EscrowError> {
        Self::require_escrow(&env, escrow_id)
    }

    fn require_escrow(env: &Env, escrow_id: u64) -> Result<Escrow, EscrowError> {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(EscrowError::NotFound)
    }

    fn next_id(env: &Env) -> u64 {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::NextId, &(id + 1));
        id
    }
}

#[cfg(test)]
mod test;
