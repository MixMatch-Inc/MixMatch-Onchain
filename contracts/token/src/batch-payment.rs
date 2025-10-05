
#![no_std]

mod rbac;
use rbac::Role;

use soroban_sdk::{
    contract, contractimpl, contracttype, log, token, Address, Env, Vec,
};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Payment {
    pub recipient: Address,
    pub amount: i128,
}

#[contract]
pub struct BatchPaymentContract;

#[contractimpl]
impl BatchPaymentContract {
    pub fn initialize(env: Env, admin: Address) {
        rbac::initialize_admin(&env, &admin);
    }

    pub fn execute_payroll(env: Env, payments: Vec<Payment>, asset: Address) {
        let admin = env.invoker();
        admin.require_auth();
        rbac::require_role(&env, &admin, Role::Admin);

        let token_client = token::Client::new(&env, &asset);
        let contract_address = env.current_contract_address();

        
        let mut total_amount: i128 = 0;
        for p in payments.iter() {
            total_amount += p.amount;
        }

        
        let contract_balance = token_client.balance(&contract_address);
        if contract_balance < total_amount {
            panic!("Insufficient funds in contract to cover payroll");
        }

        
        for payment in payments.iter() {
            token_client.transfer(&contract_address, &payment.recipient, &payment.amount);
            log!(&env, "Paid {} to {}", payment.amount, payment.recipient);
        }
    }
}