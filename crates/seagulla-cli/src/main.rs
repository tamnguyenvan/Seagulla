//! Headless benchmarks for throughput and retrieval.
//!
//! Architectural layer 3.

fn main() {
    let modules: Vec<(&str, u8)> = vec![
        (seagulla_core::NAME, seagulla_core::LAYER),
        (seagulla_db::NAME, seagulla_db::LAYER),
        (seagulla_ingest::NAME, seagulla_ingest::LAYER),
        (seagulla_search::NAME, seagulla_search::LAYER),
    ];

    println!("seagulla-cli {} — linked crates", env!("CARGO_PKG_VERSION"));
    for (name, layer) in modules {
        println!("  layer {layer}  {name}");
    }
}
