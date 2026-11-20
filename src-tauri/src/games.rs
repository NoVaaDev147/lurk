use serde::Deserialize;
use std::{fs, path::Path, time::Duration};

pub const REMOTE_URL: &str =
    "https://raw.githubusercontent.com/NoVaaDev147/lurk-data/main/games.json";

#[derive(Deserialize, Clone)]
pub struct Game {
    pub name: String,
    pub exes: Vec<String>,
}

#[derive(Deserialize)]
struct GameList {
    games: Vec<Game>,
}

const BUNDLED: &str = include_str!("../games.json");

fn parse(text: &str) -> Option<Vec<Game>> {
    let list: GameList = serde_json::from_str(text).ok()?;
    Some(
        list.games
            .into_iter()
            .map(|g| Game {
                name: g.name,
                exes: g.exes.iter().map(|e| e.to_lowercase()).collect(),
            })
            .collect(),
    )
}

pub fn load(app_data_dir: &Path) -> Vec<Game> {
    if let Ok(text) = fs::read_to_string(app_data_dir.join("games.json")) {
        if let Some(games) = parse(&text) {
            if !games.is_empty() {
                return games;
            }
        }
    }
    parse(BUNDLED).unwrap_or_default()
}

pub fn fetch_remote(app_data_dir: &Path) -> Result<usize, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(10))
        .build();

    let text = agent
        .get(REMOTE_URL)
        .call()
        .map_err(|e| e.to_string())?
        .into_string()
        .map_err(|e| e.to_string())?;

    let games= parse(&text).ok_or("downloaded file is not a valid game list")?;
    if games.is_empty()
        || games
            .iter()
            .any(|g| g.name.trim().is_empty() || g.exes.is_empty())
    {
        return Err("downloaded game list failed validation".into());
    }

    fs::create_dir_all(app_data_dir).map_err(|e| e.to_string())?;

    let tmp = app_data_dir.join("games.json.tmp");
    fs::write(&tmp, &text).map_err(|e| e.to_string())?;
    fs::rename(&tmp, app_data_dir.join("games.json")).map_err(|e| e.to_string())?;

    Ok(games.len())
}