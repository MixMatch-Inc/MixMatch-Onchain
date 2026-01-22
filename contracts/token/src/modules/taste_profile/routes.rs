use axum::routing::{get, put};
use axum::Router;

use super::handlers::{get_taste_profile_handler, put_taste_profile_handler};
use crate::state::AppState;

pub fn taste_profile_routes() -> Router<AppState> {
    Router::new()
        .route("/api/v1/taste-profile", put(put_taste_profile_handler))
        .route("/api/v1/taste-profile", get(get_taste_profile_handler))
}
