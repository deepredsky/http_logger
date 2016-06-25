defmodule HttpLogger.LogEntryController do
  use HttpLogger.Web, :controller

  def index(conn, _params) do
    render conn, "index.json", LogEntry.all
  end

  def delete_all(conn, _params) do
    LogEntry.reset
    render conn, "index.json", LogEntry.all
  end
end
