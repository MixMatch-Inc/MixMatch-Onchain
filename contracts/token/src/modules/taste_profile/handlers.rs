use axum::{extract::State, Json};
use uuid::Uuid;

use super::dto::{TasteProfileResponseDto, UpsertTasteProfileDto};
use super::repository::{get_taste_profile, upsert_taste_profile};
use super::validation::validate_taste_profile;

// adjust these imports to match your project
use crate::common::response::ApiResponse;
use crate::common::errors::ApiError;
use crate::state::AppState;
use crate::auth::AuthUser;

pub async fn put_taste_profile_handler(
    State(app_state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpsertTasteProfileDto>,
) -> Result<Json<ApiResponse<TasteProfileResponseDto>>, ApiError> {
    validate_taste_profile(&payload).map_err(ApiError::bad_request)?;

    let user_id = Uuid::parse_str(&user.id).map_err(ApiError::internal)?;

    upsert_taste_profile(
        &app_state.db,
        user_id,
        payload.favorite_genres.clone(),
        payload.preferred_vibes.clone(),
    )
    .await
    .map_err(ApiError::internal)?;

    Ok(Json(ApiResponse::success(TasteProfileResponseDto {
        user_id: user.id,
        favorite_genres: payload.favorite_genres,
        preferred_vibes: payload.preferred_vibes,
    })))
}

pub async fn get_taste_profile_handler(
    State(app_state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ApiResponse<TasteProfileResponseDto>>, ApiError> {
    let user_id = Uuid::parse_str(&user.id).map_err(ApiError::internal)?;

    let profile = get_taste_profile(&app_state.db, user_id)
        .await
        .map_err(ApiError::internal)?;

    let Some((favorite_genres_value, preferred_vibes_value)) = profile else {
        return Err(ApiError::not_found("Taste profile not found"));
    };

    let favorite_genres: Vec<String> =
        serde_json::from_value(favorite_genres_value).map_err(ApiError::internal)?;
    let preferred_vibes: Vec<String> =
        serde_json::from_value(preferred_vibes_value).map_err(ApiError::internal)?;

    Ok(Json(ApiResponse::success(TasteProfileResponseDto {
        user_id: user.id,
        favorite_genres,
        preferred_vibes,
    })))
}
