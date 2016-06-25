defmodule HttpLogger.LogEntryView do
  use HttpLogger.Web, :view

  def render("index.json", %{log_entries: log_entries}) do
    render_many(log_entries, HttpLogger.LogEntryView, "log_entry.json")
  end

  def render("show.json", %{log_entry: log_entry}) do
    render_one(log_entry, HttpLogger.LogEntryView, "log_entry.json")
  end

  def render("log_entry.json", %{log_entry: log_entry}) do
    log_entry
  end
end
