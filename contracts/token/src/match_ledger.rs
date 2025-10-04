#![no_std]

use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, Symbol, Vec, Map,
};


const ADMIN: Symbol = symbol_short!("ADMIN");
const MATCHES: Symbol = symbol_short!("MATCHES");

#[contract]
pub struct MatchLedgerContract;

#[contractimpl]
impl MatchLedgerContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&ADMIN, &admin);
        
        env.storage().persistent().set(&MATCHES, &Map::<Address, Vec<Address>>::new(&env));
    }

    pub fn record_match(env: Env, user_a: Address, user_b: Address) {
        
        let admin: Address = env.storage().instance().get(&ADMIN).expect("Admin not set");
        admin.require_auth();
        
        
        if user_a == user_b {
            panic!("User cannot be matched with themselves");
        }

        
        let mut matches_map: Map<Address, Vec<Address>> = 
            env.storage().persistent().get(&MATCHES).expect("Matches not initialized");

        
        let mut matches_for_a = matches_map.get(user_a.clone()).unwrap_or_else(|| Vec::new(&env));
        
        if !matches_for_a.contains(user_b.clone()) {
            matches_for_a.push_back(user_b.clone());
            matches_map.set(user_a.clone(), matches_for_a);
        }

        
        let mut matches_for_b = matches_map.get(user_b.clone()).unwrap_or_else(|| Vec::new(&env));
        
        if !matches_for_b.contains(user_a.clone()) {
            matches_for_b.push_back(user_a.clone());
            matches_map.set(user_b.clone(), matches_for_b);
        }

        
        env.storage().persistent().set(&MATCHES, &matches_map);
    }

    pub fn get_matches(env: Env, user: Address) -> Vec<Address> {
        let matches_map: Map<Address, Vec<Address>> = 
            env.storage().persistent().get(&MATCHES).expect("Matches not initialized");
            
        
        matches_map.get(user).unwrap_or_else(|| Vec::new(&env))
    }
    
    pub fn has_match(env: Env, user_a: Address, user_b: Address) -> bool {
        let matches_map: Map<Address, Vec<Address>> = 
            env.storage().persistent().get(&MATCHES).expect("Matches not initialized");
            
        if let Some(matches_for_a) = matches_map.get(user_a) {
            return matches_for_a.contains(user_b);
        }
        
        false
    }
    

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).expect("Admin not set");
        admin.require_auth();
        
        env.storage().instance().set(&ADMIN, &new_admin);
    }
}