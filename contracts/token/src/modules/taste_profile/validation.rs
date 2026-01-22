use super::dto::UpsertTasteProfileDto;

pub fn validate_taste_profile(dto: &UpsertTasteProfileDto) -> Result<(), String> {
    if dto.favorite_genres.is_empty() {
        return Err("favoriteGenres is required".to_string());
    }

    if dto.preferred_vibes.is_empty() {
        return Err("preferredVibes is required".to_string());
    }

    Ok(())
}
