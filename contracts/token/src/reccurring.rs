use soroban_sdk::{contractimpl, Env, Address, Vec, Map, Symbol};
use crate::storage_types::{DataKey, RecurringPayment};

pub struct RecurringPayments;

#[derive(Clone)]
pub struct RecurringPayment {
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub interval: u64,
    pub next_payment: u64,
    pub iterations: u32,
    pub completed: u32,
    pub token_address: Address,
}

#[contractimpl]
impl RecurringPayments {
    pub fn setup(
        env: Env,
        payer: Address,
        payee: Address,
        amount: i128,
        interval: u64,
        iterations: u32,
        token_address: Address,
    ) -> u32 {
        payer.require_auth();

        // Verify payer has sufficient balance for first payment
        let token_client = crate::token::Client::new(&env, &token_address);
        let payer_balance = token_client.balance(&payer);
        assert!(payer_balance >= amount, "Insufficient balance");

        // Generate payment ID
        let payment_id = env.storage().get(&DataKey::RecurringCount).unwrap_or(0) + 1;
        env.storage().set(&DataKey::RecurringCount, &payment_id);

        // Store payment info
        let payment_info = RecurringPayment {
            payer: payer.clone(),
            payee,
            amount,
            interval,
            next_payment: env.ledger().timestamp() + interval,
            iterations,
            completed: 0,
            token_address,
        };
        env.storage().set(&DataKey::Recurring(payment_id), &payment_info);

        // Execute first payment immediately
        Self::execute_payment(&env, payment_id);

        payment_id
    }

    pub fn execute(env: Env, payment_id: u32) {
        let payment_info: RecurringPayment = env.storage()
            .get(&DataKey::Recurring(payment_id))
            .unwrap()
            .unwrap();

        // Check if it's time for the next payment
        assert!(
            env.ledger().timestamp() >= payment_info.next_payment,
            "Too early for next payment"
        );
        assert!(
            payment_info.completed < payment_info.iterations,
            "All payments completed"
        );

        // Execute the payment
        Self::execute_payment(&env, payment_id);
    }

    fn execute_payment(env: &Env, payment_id: u32) {
        let mut payment_info: RecurringPayment = env.storage()
            .get(&DataKey::Recurring(payment_id))
            .unwrap()
            .unwrap();

        let token_client = crate::token::Client::new(env, &payment_info.token_address);
        
        // Transfer funds
        token_client.transfer(
            &payment_info.payer,
            &payment_info.payee,
            &payment_info.amount,
        );

        // Update payment info
        payment_info.completed += 1;
        payment_info.next_payment = env.ledger().timestamp() + payment_info.interval;
        env.storage().set(&DataKey::Recurring(payment_id), &payment_info);
    }

    pub fn get_payment(env: Env, payment_id: u32) -> RecurringPayment {
        env.storage()
            .get(&DataKey::Recurring(payment_id))
            .unwrap()
            .unwrap()
    }
}