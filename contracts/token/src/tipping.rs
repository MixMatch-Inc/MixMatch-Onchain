
#![no_std]

use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, Symbol,
    token::{self, TokenClient},
};

pub mod match_ledger_contract {
    soroban_sdk::contractimport!(
        file = "../match_ledger/target/wasm32-unknown-unknown/release/match_ledger_contract.wasm"
    );
}

const ADMIN: Symbol = symbol_short!("ADMIN");
const MATCH_CONTRACT: Symbol = symbol_short!("MATCH_C");

#[contract]
pub struct TippingContract;

#[contractimpl]
impl TippingContract {

    pub fn initialize(env: Env, admin: Address, match_contract_id: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }

        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&MATCH_CONTRACT, &match_contract_id);
    }

    pub fn send_tip(env: Env, from: Address, to: Address, token: Address, amount: i128) {
    
        from.require_auth();

    
        if from == to {
            panic!("User cannot tip themselves");
        }
        if amount <= 0 {
            panic!("Tip amount must be positive");
        }

    
    
        let match_contract_id: Address = env.storage().instance().get(&MATCH_CONTRACT).expect("Match contract not set");
        
    
        let match_client = match_ledger_contract::Client::new(&env, &match_contract_id);

    
    
        if !match_client.has_match(&from, &to) {
            panic!("A match does not exist between these users");
        }
    

    
        let token_client = TokenClient::new(&env, &token);
        
    
        token_client.transfer(&from, &to, &amount);


        env.events().publish(
            (symbol_short!("tip"), symbol_short!("sent")),
            (from, to, token, amount),
        );
    }
    

    pub fn set_match_contract(env: Env, new_match_contract_id: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).expect("Admin not set");
        admin.require_auth();
        
        env.storage().instance().set(&MATCH_CONTRACT, &new_match_contract_id);
    }
}