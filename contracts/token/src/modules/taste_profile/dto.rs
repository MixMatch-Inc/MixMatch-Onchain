use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct UpsertTasteProfileDto {
    #[serde(rename = "favoriteGenres")]
    pub favorite_genres: Vec<String>,

    #[serde(rename = "preferredVibes")]
    pub preferred_vibes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct TasteProfileResponseDto {
    #[serde(rename = "userId")]
    pub user_id: String,

    #[serde(rename = "favoriteGenres")]
    pub favorite_genres: Vec<String>,

    #[serde(rename = "preferredVibes")]
    pub preferred_vibes: Vec<String>,
}
