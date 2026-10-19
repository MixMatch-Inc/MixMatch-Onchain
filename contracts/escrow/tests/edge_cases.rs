//! Black-box edge cases against the public contract interface: unknown ids,
//! invalid amounts, balances, id allocation and the full state-transition matrix.
use mixmatch_escrow::{EscrowContract, EscrowContractClient, EscrowError, EscrowStatus};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env,
};

const MINTED: i128 = 1_000_000;
const TIMEOUT: u32 = 10;

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

impl Setup<'_> {
    fn deposit(&self, amount: i128) -> u64 {
        self.client
            .deposit(&self.payer, &self.payee, &self.token_id, &amount, &TIMEOUT)
    }

    fn balance(&self, who: &Address) -> i128 {
        token::Client::new(&self.env, &self.token_id).balance(who)
    }

    fn advance_past_timeout(&self) {
        self.env
            .ledger()
            .with_mut(|li| li.sequence_number += TIMEOUT + 1);
    }
}

// --- unknown ids ------------------------------------------------------------

#[test]
fn release_fails_for_an_unknown_id() {
    let s = setup();
    assert_eq!(s.client.try_release(&42), Err(Ok(EscrowError::NotFound)));
}

#[test]
fn refund_fails_for_an_unknown_id() {
    let s = setup();
    assert_eq!(s.client.try_refund(&42), Err(Ok(EscrowError::NotFound)));
}

#[test]
fn an_id_beyond_the_last_allocated_one_is_unknown() {
    let s = setup();
    let id = s.deposit(100);
    assert_eq!(
        s.client.try_release(&(id + 1)),
        Err(Ok(EscrowError::NotFound))
    );
}

// --- invalid and extreme amounts -------------------------------------------

#[test]
fn deposit_rejects_negative_amounts() {
    let s = setup();
    for amount in [-1_i128, -500, i128::MIN] {
        let result = s
            .client
            .try_deposit(&s.payer, &s.payee, &s.token_id, &amount, &TIMEOUT);
        assert_eq!(result, Err(Ok(EscrowError::InvalidAmount)), "amount {amount}");
    }
    assert_eq!(s.balance(&s.payer), MINTED);
}

// --- balances and id allocation --------------------------------------------

#[test]
fn deposit_fails_when_the_payer_cannot_cover_the_amount() {
    let s = setup();

    let result = s.client.try_deposit(
        &s.payer,
        &s.payee,
        &s.token_id,
        &(MINTED + 1),
        &TIMEOUT,
    );

    assert!(result.is_err());
    assert_eq!(s.balance(&s.payer), MINTED, "payer keeps their funds");
    assert_eq!(s.balance(&s.client.address), 0);
}

#[test]
fn a_failed_deposit_does_not_consume_an_id() {
    let s = setup();
    let _ = s
        .client
        .try_deposit(&s.payer, &s.payee, &s.token_id, &(MINTED + 1), &TIMEOUT);

    assert_eq!(s.deposit(100), 0);
}

#[test]
fn sequential_deposits_get_sequential_ids() {
    let s = setup();

    let first = s.deposit(100);
    let second = s.deposit(200);

    assert_eq!((first, second), (0, 1));
    assert_eq!(s.client.get_escrow(&first).amount, 100);
    assert_eq!(s.client.get_escrow(&second).amount, 200);
}

#[test]
fn ids_keep_counting_after_escrows_are_finalized() {
    let s = setup();
    let first = s.deposit(100);
    let second = s.deposit(100);
    s.client.release(&first);
    s.client.refund(&second);

    assert_eq!(s.deposit(100), 2);
}

// --- state transition matrix -----------------------------------------------

#[test]
fn locked_escrow_can_be_released_or_refunded() {
    let s = setup();
    let to_release = s.deposit(100);
    let to_refund = s.deposit(100);

    s.client.release(&to_release);
    s.client.refund(&to_refund);

    assert_eq!(s.client.get_escrow(&to_release).status, EscrowStatus::Released);
    assert_eq!(s.client.get_escrow(&to_refund).status, EscrowStatus::Refunded);
}

#[test]
fn released_escrow_cannot_be_released_or_refunded_again() {
    let s = setup();
    let id = s.deposit(100);
    s.client.release(&id);

    assert_eq!(s.client.try_release(&id), Err(Ok(EscrowError::AlreadyFinalized)));
    assert_eq!(s.client.try_refund(&id), Err(Ok(EscrowError::AlreadyFinalized)));
    assert_eq!(s.client.get_escrow(&id).status, EscrowStatus::Released);
    assert_eq!(s.balance(&s.payee), 100);
    assert_eq!(s.balance(&s.payer), MINTED - 100);
}

#[test]
fn refunded_escrow_cannot_be_released_or_refunded_again() {
    let s = setup();
    let id = s.deposit(100);
    s.client.refund(&id);

    assert_eq!(s.client.try_release(&id), Err(Ok(EscrowError::AlreadyFinalized)));
    assert_eq!(s.client.try_refund(&id), Err(Ok(EscrowError::AlreadyFinalized)));
    assert_eq!(s.client.get_escrow(&id).status, EscrowStatus::Refunded);
    assert_eq!(s.balance(&s.payee), 0);
    assert_eq!(s.balance(&s.payer), MINTED);
}

#[test]
fn refund_after_timeout_then_release_is_rejected() {
    let s = setup();
    let id = s.deposit(100);
    s.advance_past_timeout();

    s.client.refund(&id);

    assert_eq!(s.client.try_release(&id), Err(Ok(EscrowError::AlreadyFinalized)));
}

// --- timing -------------------------------------------------------------------

#[test]
fn release_after_the_timeout_still_pays_the_payee() {
    let s = setup();
    let id = s.deposit(100);
    s.advance_past_timeout();

    s.client.release(&id);

    assert_eq!(s.client.get_escrow(&id).status, EscrowStatus::Released);
    assert_eq!(s.balance(&s.payee), 100);
}

#[test]
fn release_still_requires_the_payer_after_the_timeout() {
    let s = setup();
    let id = s.deposit(100);
    s.advance_past_timeout();

    s.env.set_auths(&[]);
    assert!(s.client.try_release(&id).is_err());

    assert_eq!(s.client.get_escrow(&id).status, EscrowStatus::Locked);
    assert_eq!(s.balance(&s.client.address), 100);
}

#[test]
fn refund_before_the_timeout_requires_the_payer() {
    let s = setup();
    let id = s.deposit(100);

    s.env.set_auths(&[]);
    assert!(s.client.try_refund(&id).is_err());

    assert_eq!(s.client.get_escrow(&id).status, EscrowStatus::Locked);
}
