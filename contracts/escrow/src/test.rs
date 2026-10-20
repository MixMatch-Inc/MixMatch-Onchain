#![cfg(test)]

use super::{EscrowContract, EscrowContractClient, EscrowError, EscrowStatus};
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, Ledger},
    symbol_short, token, Address, Env,
};

struct TestSetup<'a> {
    env: Env,
    client: EscrowContractClient<'a>,
    token: token::StellarAssetClient<'a>,
    token_id: Address,
    payer: Address,
    payee: Address,
}

fn setup() -> TestSetup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract_id.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    let payer = Address::generate(&env);
    let payee = Address::generate(&env);
    token_admin_client.mint(&payer, &1_000_000);

    TestSetup {
        env,
        client,
        token: token_admin_client,
        token_id,
        payer,
        payee,
    }
}

#[test]
fn deposit_locks_funds_in_the_contract() {
    let setup = setup();
    let token_client = token::Client::new(&setup.env, &setup.token_id);

    let escrow_id = setup.client.deposit(
        &setup.payer,
        &setup.payee,
        &setup.token_id,
        &500,
        &100,
    );

    assert_eq!(token_client.balance(&setup.payer), 1_000_000 - 500);
    assert_eq!(
        token_client.balance(&setup.client.address),
        500
    );

    let escrow = setup.client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Locked);
    assert_eq!(escrow.amount, 500);
    assert_eq!(escrow.payer, setup.payer);
    assert_eq!(escrow.payee, setup.payee);

    let _ = setup.token;
}

#[test]
fn release_pays_out_to_the_payee() {
    let setup = setup();
    let token_client = token::Client::new(&setup.env, &setup.token_id);

    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    setup.client.release(&escrow_id);

    assert_eq!(token_client.balance(&setup.payee), 500);
    assert_eq!(token_client.balance(&setup.client.address), 0);

    let escrow = setup.client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
fn release_cannot_be_called_twice() {
    let setup = setup();
    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    setup.client.release(&escrow_id);

    let result = setup.client.try_release(&escrow_id);
    assert_eq!(result, Err(Ok(EscrowError::AlreadyFinalized)));
}

#[test]
fn refund_before_timeout_returns_funds_to_the_payer() {
    let setup = setup();
    let token_client = token::Client::new(&setup.env, &setup.token_id);

    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    setup.client.refund(&escrow_id);

    assert_eq!(token_client.balance(&setup.payer), 1_000_000);
    let escrow = setup.client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);
}

#[test]
fn refund_after_timeout_does_not_require_payer_authorization() {
    let setup = setup();
    let token_client = token::Client::new(&setup.env, &setup.token_id);

    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &10);

    setup.env.ledger().with_mut(|li| {
        li.sequence_number += 11;
    });

    // Clear the mocked-auths allowlist: if `refund` incorrectly required
    // authorization past the timeout, this call would panic.
    setup.env.set_auths(&[]);
    setup.client.refund(&escrow_id);

    assert_eq!(token_client.balance(&setup.payer), 1_000_000);
    let escrow = setup.client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);
}

#[test]
fn refund_cannot_be_called_twice() {
    let setup = setup();
    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    setup.client.refund(&escrow_id);

    let result = setup.client.try_refund(&escrow_id);
    assert_eq!(result, Err(Ok(EscrowError::AlreadyFinalized)));
}

#[test]
fn deposit_rejects_a_non_positive_amount() {
    let setup = setup();

    let result = setup
        .client
        .try_deposit(&setup.payer, &setup.payee, &setup.token_id, &0, &100);
    assert_eq!(result, Err(Ok(EscrowError::InvalidAmount)));
}

#[test]
fn get_escrow_fails_for_an_unknown_id() {
    let setup = setup();

    let result = setup.client.try_get_escrow(&999);
    assert_eq!(result, Err(Ok(EscrowError::NotFound)));
}

#[test]
fn deposit_records_the_payers_authorization() {
    let setup = setup();

    setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    let auths = setup.env.auths();
    assert!(
        auths.iter().any(|(address, invocation)| {
            address == &setup.payer
                && matches!(
                    &invocation.function,
                    AuthorizedFunction::Contract((contract, name, _))
                        if contract == &setup.client.address
                            && name == &symbol_short!("deposit")
                )
        }),
        "deposit must record the payer's authorization"
    );
}

#[test]
fn release_records_the_payers_authorization() {
    let setup = setup();
    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    setup.client.release(&escrow_id);

    let auths = setup.env.auths();
    assert!(
        auths.iter().any(|(address, invocation)| {
            address == &setup.payer
                && matches!(
                    &invocation.function,
                    AuthorizedFunction::Contract((contract, name, _))
                        if contract == &setup.client.address
                            && name == &symbol_short!("release")
                )
        }),
        "release must record the payer's authorization"
    );
}

#[test]
fn refund_before_timeout_records_the_payers_authorization() {
    let setup = setup();
    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    setup.client.refund(&escrow_id);

    let auths = setup.env.auths();
    assert!(
        auths.iter().any(|(address, invocation)| {
            address == &setup.payer
                && matches!(
                    &invocation.function,
                    AuthorizedFunction::Contract((contract, name, _))
                        if contract == &setup.client.address
                            && name == &symbol_short!("refund")
                )
        }),
        "refund before the timeout must record the payer's authorization"
    );
}

#[test]
fn release_without_the_payers_authorization_fails() {
    let setup = setup();
    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    // Clear the mocked-auths allowlist: `release` must fail without the
    // payer's authorization, leaving the escrow and its funds untouched.
    setup.env.set_auths(&[]);
    let result = setup.client.try_release(&escrow_id);
    assert!(
        result.is_err(),
        "release succeeded without the payer's authorization"
    );

    let token_client = token::Client::new(&setup.env, &setup.token_id);
    assert_eq!(token_client.balance(&setup.client.address), 500);
    assert_eq!(
        setup.client.get_escrow(&escrow_id).status,
        EscrowStatus::Locked
    );
}

#[test]
fn refund_before_timeout_without_the_payers_authorization_fails() {
    let setup = setup();
    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &100);

    // Clear the mocked-auths allowlist: `refund` before the timeout must fail
    // without the payer's authorization, leaving the escrow locked.
    setup.env.set_auths(&[]);
    let result = setup.client.try_refund(&escrow_id);
    assert!(
        result.is_err(),
        "refund before the timeout succeeded without the payer's authorization"
    );

    let token_client = token::Client::new(&setup.env, &setup.token_id);
    assert_eq!(token_client.balance(&setup.client.address), 500);
    assert_eq!(
        setup.client.get_escrow(&escrow_id).status,
        EscrowStatus::Locked
    );
}

#[test]
fn refund_after_timeout_records_no_authorization() {
    let setup = setup();
    let escrow_id = setup
        .client
        .deposit(&setup.payer, &setup.payee, &setup.token_id, &500, &10);

    setup.env.ledger().with_mut(|li| {
        li.sequence_number += 11;
    });

    setup.env.set_auths(&[]);
    setup.client.refund(&escrow_id);

    assert!(
        setup.env.auths().is_empty(),
        "refund after the timeout must not require any authorization"
    );
    assert_eq!(
        setup.client.get_escrow(&escrow_id).status,
        EscrowStatus::Refunded
    );
}
