require IEx
defmodule Request do
  defstruct request_path: nil, params: nil,  headers: [], method: nil, body: nil, options: []
end

defmodule Response do
  defstruct type: "ok", status_code: nil, headers: [], body: nil
end

defmodule Proxy do
  use Plug.Builder
  import Plug.Conn

  @target "http://localhost:8082"

  plug Plug.RequestId
  plug Plug.Logger
  plug :dispatch

  def start_interceptor do
    { :ok, _ } = Plug.Adapters.Cowboy.http Proxy, [], port: 8080
  end

  def dispatch(conn, _opts) do
    # Start a request to the client saying we will stream the body.
    # We are simply passing all req_headers forward.
    conn = conn
            |> Plug.Conn.put_req_header( "x-forwarded-for", ip_to_string(conn.remote_ip))
    {:ok, request_body, _conn} = Plug.Conn.read_body(conn)
    {:ok, status, headers, client} = :hackney.request(conn.method, uri(conn), conn.req_headers, request_body, [])
    {:ok, body} = :hackney.body(client)

    gzipped = Enum.any?(headers, fn (kv) ->
      case kv do
        {"Content-Encoding", "gzip"} -> true
        _ -> false
      end
    end)

    # body is an Elixir string
    parsed_body = if gzipped do
      :zlib.gunzip(body)
    else
      body
    end

    response = {:ok, status, headers, parsed_body}

    request =  Converter.conn_to_string(conn)
    # Delete the transfer encoding header. Ideally, we would read
    # if it is chunked or not and act accordingly to support streaming.
    #
    # We may also need to delete other headers in a proxy.
    headers = List.keydelete(headers, "Transfer-Encoding", 0)

    LogEntry.push(Converter.convert_to_string(request, response))

    %{conn | resp_headers: headers}
    |> send_resp(status, body)
  end

  defp uri(conn) do
    base = @target <> "/" <> Enum.join(conn.path_info, "/")
    case conn.query_string do
      "" -> base
      qs -> base <> "?" <> qs
    end
  end

  defp ip_to_string({a,b,c,d}), do: "#{a}.#{b}.#{c}.#{d}"
end
