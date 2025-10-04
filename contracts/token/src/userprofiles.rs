#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

const PROFILES: Symbol = symbol_short!("PROFILES");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserProfile {
    pub owner: Address,
    pub interests: Vec<Symbol>,
    pub active: bool,
}

#[contract]
pub struct UserProfileContract;

#[contractimpl]
impl UserProfileContract {
    pub fn create_profile(env: Env, owner: Address, interests: Vec<Symbol>) {
    
        owner.require_auth();

    
        let mut profiles: soroban_sdk::Map<Address, UserProfile> =
            env.storage().persistent().get(&PROFILES).unwrap_or_else(|| soroban_sdk::Map::new(&env));

    
        if profiles.contains_key(owner.clone()) {
            panic!("Profile already exists for this address");
        }

    
        let profile = UserProfile {
            owner: owner.clone(),
            interests,
            active: true,
        };

    
        profiles.set(owner, profile);
        env.storage().persistent().set(&PROFILES, &profiles);
    }

    pub fn update_interests(env: Env, owner: Address, new_interests: Vec<Symbol>) {
        owner.require_auth();

        let mut profiles: soroban_sdk::Map<Address, UserProfile> =
            env.storage().persistent().get(&PROFILES).expect("Profiles map not initialized");

    
        let mut profile = profiles.get(owner.clone()).expect("Profile not found");

    
        profile.interests = new_interests;
        profiles.set(owner, profile);

    
        env.storage().persistent().set(&PROFILES, &profiles);
    }

    pub fn set_active_status(env: Env, owner: Address, is_active: bool) {
        owner.require_auth();

        let mut profiles: soroban_sdk::Map<Address, UserProfile> =
            env.storage().persistent().get(&PROFILES).expect("Profiles map not initialized");

        let mut profile = profiles.get(owner.clone()).expect("Profile not found");

    
        profile.active = is_active;
        profiles.set(owner, profile);

        env.storage().persistent().set(&PROFILES, &profiles);
    }

    pub fn get_profile(env: Env, owner: Address) -> UserProfile {
        let profiles: soroban_sdk::Map<Address, UserProfile> =
            env.storage().persistent().get(&PROFILES).expect("Profiles map not initialized");

        profiles.get(owner).expect("Profile not found")
    }
}