//! Edge-case tests: timeout overflow, TTL/archival behaviour, a custom SEP-41
//! token, and a seeded randomized check of the escrow balance invariant.
#![cfg(test)]

extern crate std;

use super::{DataKey, EscrowContract, EscrowContractClient, EscrowError, EscrowStatus};
use soroban_sdk::{
    contract, contractimpl,
    testutils::{storage::Persistent as _, Address as _, Ledger},
    token, Address, Env,
};

const MINTED: i128 = 1_000_000;

struct Setup<'a> {
    env: Env,
    client: EscrowContractClient<'a>,
    token_id: Address,
    payer: Address,
    payee: Address,
}

fn setup() -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let token_id = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    token::StellarAssetClient::new(&env, &token_id).mint(&payer, &MINTED);

    Setup {
        env,
        client,
        token_id,
        payer,
        payee,
    }
}

fn set_sequence(env: &Env, sequence: u32) {
    env.ledger().with_mut(|li| li.sequence_number = sequence);
}

fn escrow_ttl(s: &Setup, escrow_id: u64) -> u32 {
    s.env.as_contract(&s.client.address, || {
        s.env
            .storage()
            .persistent()
            .get_ttl(&DataKey::Escrow(escrow_id))
    })
}

// --- timeout overflow ---------------------------------------------------------

#[test]
fn deposit_rejects_a_timeout_that_overflows_the_ledger_sequence() {
    let s = setup();
    set_sequence(&s.env, 1);
    let token_client = token::Client::new(&s.env, &s.token_id);

    let result = s
        .client
        .try_deposit(&s.payer, &s.payee, &s.token_id, &500, &u32::MAX);

    assert_eq!(result, Err(Ok(EscrowError::InvalidTimeout)));
    assert_eq!(token_client.balance(&s.payer), MINTED, "no funds may move");
    assert_eq!(
        s.client.try_get_escrow(&0),
        Err(Ok(EscrowError::NotFound)),
        "no escrow may be created"
    );
}

#[test]
fn deposit_accepts_the_largest_timeout_that_still_fits() {
    let s = setup();
    set_sequence(&s.env, 100);

    let id = s
        .client
        .deposit(&s.payer, &s.payee, &s.token_id, &500, &(u32::MAX - 100));

    assert_eq!(s.client.get_escrow(&id).timeout_ledger, u32::MAX);
}

// --- TTL and archival ---------------------------------------------------------

#[test]
fn a_new_escrow_entry_gets_a_live_ttl() {
    let s = setup();
    let id = s
        .client
        .deposit(&s.payer, &s.payee, &s.token_id, &500, &100);

    let min_ttl = s.env.ledger().get().min_persistent_entry_ttl;
    let ttl = escrow_ttl(&s, id);
    assert!(ttl > 0 && ttl <= min_ttl, "ttl {ttl} outside 1..={min_ttl}");
}

#[test]
fn extending_the_ttl_keeps_the_escrow_alive_for_that_long() {
    let s = setup();
    let id = s
        .client
        .deposit(&s.payer, &s.payee, &s.token_id, &500, &100);

    s.env.as_contract(&s.client.address, || {
        s.env
            .storage()
            .persistent()
            .extend_ttl(&DataKey::Escrow(id), 100_000, 100_000);
    });

    assert_eq!(escrow_ttl(&s, id), 100_000);
}

#[test]
fn an_archived_escrow_is_restored_and_can_still_be_released() {
    let s = setup();
    let token_client = token::Client::new(&s.env, &s.token_id);
    let id = s
        .client
        .deposit(&s.payer, &s.payee, &s.token_id, &500, &100);

    // Move past the entry's TTL: it is now archived.
    let min_ttl = s.env.ledger().get().min_persistent_entry_ttl;
    set_sequence(&s.env, s.env.ledger().sequence() + min_ttl + 1_000);

    // Access restores it automatically (protocol 23+); state is intact.
    let escrow = s.client.get_escrow(&id);
    assert_eq!(escrow.status, EscrowStatus::Locked);
    assert_eq!(escrow.amount, 500);
    assert_eq!(escrow_ttl(&s, id), min_ttl - 1);

    s.client.release(&id);
    assert_eq!(token_client.balance(&s.payee), 500);
}

#[test]
fn an_archived_escrow_past_its_timeout_can_be_refunded_without_auth() {
    let s = setup();
    let token_client = token::Client::new(&s.env, &s.token_id);
    let id = s
        .client
        .deposit(&s.payer, &s.payee, &s.token_id, &500, &100);

    let min_ttl = s.env.ledger().get().min_persistent_entry_ttl;
    set_sequence(&s.env, s.env.ledger().sequence() + min_ttl + 1_000);

    s.env.set_auths(&[]);
    s.client.refund(&id);

    assert_eq!(token_client.balance(&s.payer), MINTED);
    assert_eq!(s.client.get_escrow(&id).status, EscrowStatus::Refunded);
}

// --- custom SEP-41 token ------------------------------------------------------

/// Minimal token implementing the functions the escrow calls on a SEP-41 token.
#[contract]
struct TestToken;

#[contractimpl]
impl TestToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        let balance = Self::balance(env.clone(), to.clone());
        env.storage().persistent().set(&to, &(balance + amount));
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage().persistent().get(&id).unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance = Self::balance(env.clone(), from.clone());
        assert!(from_balance >= amount, "insufficient balance");
        env.storage()
            .persistent()
            .set(&from, &(from_balance - amount));
        let to_balance = Self::balance(env.clone(), to.clone());
        env.storage().persistent().set(&to, &(to_balance + amount));
    }
}

#[test]
fn escrows_in_different_tokens_do_not_interfere() {
    let s = setup();
    let custom_id = s.env.register(TestToken, ());
    let custom = TestTokenClient::new(&s.env, &custom_id);
    custom.mint(&s.payer, &MINTED);
    let sac = token::Client::new(&s.env, &s.token_id);

    let sac_escrow = s
        .client
        .deposit(&s.payer, &s.payee, &s.token_id, &300, &100);
    let custom_escrow = s
        .client
        .deposit(&s.payer, &s.payee, &custom_id, &700, &100);

    assert_eq!(sac.balance(&s.client.address), 300);
    assert_eq!(custom.balance(&s.client.address), 700);

    s.client.release(&custom_escrow);
    assert_eq!(custom.balance(&s.payee), 700);
    assert_eq!(custom.balance(&s.client.address), 0);
    assert_eq!(sac.balance(&s.client.address), 300, "other token untouched");

    s.client.refund(&sac_escrow);
    assert_eq!(sac.balance(&s.payer), MINTED);
    assert_eq!(s.client.get_escrow(&custom_escrow).token, custom_id);
}

// --- randomized invariant -----------------------------------------------------

/// Small deterministic xorshift generator, so failures reproduce from the seed.
struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }

    fn below(&mut self, bound: u64) -> u64 {
        self.next() % bound
    }
}

#[test]
fn contract_balance_always_equals_the_sum_of_locked_escrows() {
    for seed in [1_u64, 7, 42, 2024, 99_999] {
        let s = setup();
        let custom_id = s.env.register(TestToken, ());
        let custom = TestTokenClient::new(&s.env, &custom_id);
        custom.mint(&s.payer, &MINTED);
        let tokens = [s.token_id.clone(), custom_id.clone()];
        let balance_of = |token: &Address| token::Client::new(&s.env, token).balance(&s.client.address);

        let mut rng = Rng(seed);
        let mut ids: std::vec::Vec<u64> = std::vec::Vec::new();

        for step in 0..150 {
            match rng.below(3) {
                0 => {
                    let token = &tokens[rng.below(2) as usize];
                    let amount = 1 + rng.below(500) as i128;
                    let timeout = rng.below(50) as u32;
                    // Deposits may fail once the payer runs low; that must change nothing.
                    if let Ok(Ok(id)) =
                        s.client
                            .try_deposit(&s.payer, &s.payee, token, &amount, &timeout)
                    {
                        ids.push(id);
                    }
                }
                1 if !ids.is_empty() => {
                    let id = ids[rng.below(ids.len() as u64) as usize];
                    let _ = s.client.try_release(&id);
                }
                _ if !ids.is_empty() => {
                    let id = ids[rng.below(ids.len() as u64) as usize];
                    let _ = s.client.try_refund(&id);
                    set_sequence(&s.env, s.env.ledger().sequence() + rng.below(20) as u32);
                }
                _ => {}
            }

            for token in &tokens {
                let locked: i128 = ids
                    .iter()
                    .map(|id| s.client.get_escrow(id))
                    .filter(|e| e.status == EscrowStatus::Locked && &e.token == token)
                    .map(|e| e.amount)
                    .sum();
                assert_eq!(
                    balance_of(token),
                    locked,
                    "seed {seed} step {step}: contract balance != sum of locked escrows"
                );
            }
        }
    }
}
