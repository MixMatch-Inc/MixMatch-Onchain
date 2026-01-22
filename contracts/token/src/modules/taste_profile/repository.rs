use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

pub async fn upsert_taste_profile(
    pool: &PgPool,
    user_id: Uuid,
    favorite_genres: Vec<String>,
    preferred_vibes: Vec<String>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO taste_profiles (user_id, favorite_genres, preferred_vibes)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          favorite_genres = EXCLUDED.favorite_genres,
          preferred_vibes = EXCLUDED.preferred_vibes,
          updated_at = NOW()
        "#,
        user_id,
        json!(favorite_genres),
        json!(preferred_vibes),
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_taste_profile(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<(serde_json::Value, serde_json::Value)>, sqlx::Error> {
    let row = sqlx::query!(
        r#"
        SELECT favorite_genres, preferred_vibes
        FROM taste_profiles
        WHERE user_id = $1
        "#,
        user_id
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| (r.favorite_genres, r.preferred_vibes)))
}

pub async fn user_has_taste_profile(pool: &PgPool, user_id: Uuid) -> Result<bool, sqlx::Error> {
    let row = sqlx::query!(
        r#"SELECT id FROM taste_profiles WHERE user_id = $1"#,
        user_id
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.is_some())
}
