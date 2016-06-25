defmodule HttpLogger.Router do
  use HttpLogger.Web, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", HttpLogger do
    pipe_through :api
    resources "/entries", LogEntryController, only: [:index, :show, :delete]
    delete "/entries", LogEntryController, :delete_all
  end

  scope "/", HttpLogger do
    pipe_through :browser # Use the default browser stack

    get "*path", PageController, :index
  end
end
