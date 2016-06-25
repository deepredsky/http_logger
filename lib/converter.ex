defmodule Converter do
  def convert_from_string(%{"request" => request, "response" => response}) do
    %{ request:  string_to_request(request), response: string_to_response(response) }
  end

  def convert_to_string(request, response) do
    parsed_response  = response_to_string(response)
    id = parsed_response.headers["sc-request-id"]
    %{ id: id, request:  request, response: parsed_response}
  end

  defp string_to_request(string) do
    request = Enum.map(string, fn({x,y}) -> {String.to_atom(x),y} end) |> Enum.into(%{})
    struct(Request, request)
  end

  defp parse_headers(headers) do
    headers = do_parse_headers(headers, [])
    headers
  end

  defp do_parse_headers([], acc) do
    Enum.reverse(acc)
    |> Enum.uniq(fn({key,_value}) -> key end)
    |> Enum.into(%{})
  end
  defp do_parse_headers([{key,value}|tail], acc) do
    replaced_value = to_string(value)
    do_parse_headers(tail, [{to_string(key), replaced_value}|acc])
  end

  def parse_request_body(:error), do: "f"

  def parse_request_body({:form, body}) do
    :hackney_request.encode_form(body)
    |> elem(2)
    |> to_string
  end

  def parse_request_body({:ok, body}) do
    body
  end

  def parse_request_body(conn) do
    {:ok, body, _conn} = Plug.Conn.read_body(conn, length: 1_000_000)
    try do
      to_string(body)
    rescue
      _e in Protocol.UndefinedError -> inspect(body)
    end
  end

  defp string_to_response(string) do
    response = Enum.map(string, fn({x, y}) -> {String.to_atom(x), y} end)
    response = struct(Response, response)

    response =
    if is_map(response.headers) do
      headers = response.headers |> Map.to_list
      %{response | headers: headers}
    else
      response
    end

    response
  end

  def conn_to_string(conn) do
    conn = Plug.Conn.fetch_query_params(conn)
    %Request{
      request_path: conn.request_path,
      params: conn.params,
      headers: parse_headers(conn.req_headers),
      method: to_string(conn.method),
      body: parse_request_body(conn)
    }
  end

  def request_to_string([method, _url, headers, body, options]) do
    %Request{
      headers: parse_headers(headers),
      method: to_string(method),
      body: parse_request_body(body),
      options: sanitize_options(options)
    }
  end

  # If option value is tuple, make it as list, for encoding as json.
  defp sanitize_options(options) do
    Enum.map(options, fn({key, value}) ->
      if is_tuple(value) do
        {key, Tuple.to_list(value)}
      else
        {key, value}
      end
    end)
  end

  defp response_to_string({:ok, status_code, headers, body}) do
    %Response{
      type: "ok",
      status_code: status_code,
      headers: parse_headers(headers),
      body: parse_response_body(body)
    }
  end

  defp response_to_string({:error, reason}) do
    %Response{
      type: "error",
      body: Atom.to_string(reason)
    }
  end

  defp parse_response_body(body) do
    body
  end
end
