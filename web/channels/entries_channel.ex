defmodule HttpLogger.EntriesChannel do
  use Phoenix.Channel

  def join("entries:new", _auth_msg, socket) do
    {:ok, socket}
  end
end
