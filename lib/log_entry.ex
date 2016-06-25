defmodule LogEntry do
  def start_link do
    Agent.start_link(fn -> [] end, name: __MODULE__)
  end

  @doc "Returns a list of all sent entrys"
  def all do
    Agent.get(__MODULE__, fn(entries) -> entries end)
  end

  def push(entry) do
    Agent.update(__MODULE__, fn(entries) ->
      push_item(entries, entry)
    end)
    entry
  end

  @doc "Clears all sent entries"
  def reset do
    Agent.update(__MODULE__, fn(_) ->
      []
    end)
  end

  defp push_item(entries, entry) when length(entries) >= 50 do
    [_head | rest] = entries
    [entry | rest ]
  end

  defp push_item(entries, entry) do
    [entry | entries]
  end
end
