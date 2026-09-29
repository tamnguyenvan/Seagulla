//! SQLite storage, migrations, repositories and the vector index.
//!
//! Architectural layer 1. A crate may depend only on strictly lower layers; see
//! `scripts/architecture.json`, enforced by `scripts/check_layering.py` in CI.

/// Crate name, matching the package name in `Cargo.toml`.
pub const NAME: &str = "seagulla-db";

/// Architectural layer.
pub const LAYER: u8 = 1;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_matches_package() {
        assert_eq!(NAME, env!("CARGO_PKG_NAME"));
    }

    #[test]
    fn declares_expected_layer() {
        assert_eq!(LAYER, 1);
    }
}
