use tauri::{Manager, Theme, window::Color};

/// The window's background before the page paints: matches `packages/tokens`'
/// `color.bg` (the page background -- not `surface`, since `bg` is what's visible for
/// the one frame before the web build's own CSS has painted anything over it). Read
/// from the OS theme in `run`'s `setup`, below, because that's the only theme Tauri can
/// see this early; the webview repaints to match the user's own in-app preference
/// moments later, once it's loaded.
const BG_LIGHT: Color = Color(0xff, 0xff, 0xff, 0xff);
const BG_DARK: Color = Color(0x09, 0x09, 0x0b, 0xff);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Persists the window's size, position and maximized state across launches. It
    // restores them once the window is ready and only then calls `show()` -- which is
    // why `tauri.conf.json`'s window starts `"visible": false`: the window never
    // flashes at its *configured* 900x600 default before snapping to the saved
    // geometry on the next launch.
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // No flash of white (or black) on launch: paint the window's background to
      // match the OS theme before the webview's own CSS has had a chance to run, for
      // the gap between process start and first paint (still hidden at this point --
      // `tauri-plugin-window-state`, above, shows the window once it has restored the
      // saved geometry).
      if let Some(window) = app.get_webview_window("main") {
        let background = match window.theme() {
          Ok(Theme::Dark) => BG_DARK,
          _ => BG_LIGHT,
        };
        let _ = window.set_background_color(Some(background));
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
