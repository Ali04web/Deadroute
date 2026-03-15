# sdk/ruby/deadroute.rb
# DeadRoute Ruby SDK
# Supports: Rails, Sinatra, and any Rack-compatible framework
#
# Install: gem install deadroute-ruby
#
# Quick start (Rails):
#   # config/initializers/deadroute.rb
#   DeadRoute.configure do |c|
#     c.api_key    = ENV["DEADROUTE_API_KEY"]
#     c.ingest_url = ENV["DEADROUTE_INGEST_URL"]
#   end
#
#   # config/application.rb
#   config.middleware.use DeadRoute::Middleware

require "net/http"
require "json"
require "thread"

module DeadRoute
  class Configuration
    attr_accessor :api_key, :ingest_url, :batch_size, :flush_interval,
                  :sample_rate, :exclude, :framework

    def initialize
      @api_key        = ENV["DEADROUTE_API_KEY"] || ""
      @ingest_url     = ENV["DEADROUTE_INGEST_URL"] || "https://your-app.vercel.app/api/ingest"
      @batch_size     = 50
      @flush_interval = 5
      @sample_rate    = 1.0
      @exclude        = []   # Array of Regexp
      @framework      = "rack"
    end
  end

  class << self
    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield configuration
    end

    def client
      @client ||= Client.new(configuration)
    end
  end

  # ─── Core Client ─────────────────────────────────────────────────────────────

  class Client
    def initialize(config)
      @config  = config
      @queue   = Queue.new
      @mutex   = Mutex.new
      @running = true

      @worker = Thread.new { flush_loop }
      @worker.abort_on_exception = false

      at_exit { shutdown }
    end

    def record(method:, path:, status_code: nil, duration_ms: nil, user_agent: nil)
      return if rand > @config.sample_rate
      return if @config.exclude.any? { |re| re.match?(path) }

      @queue.push({
        method:      method.to_s.upcase,
        path:        path,
        statusCode:  status_code,
        durationMs:  duration_ms,
        userAgent:   user_agent,
        framework:   @config.framework,
      }.compact)
    end

    private

    def flush_loop
      buffer = []
      while @running
        deadline = Time.now + @config.flush_interval
        while Time.now < deadline
          begin
            hit = @queue.pop(true)   # non-blocking
            buffer << hit
            if buffer.size >= @config.batch_size
              send_hits(buffer)
              buffer = []
            end
          rescue ThreadError
            sleep 0.1
          end
        end
        send_hits(buffer) unless buffer.empty?
        buffer = []
      end
    end

    def send_hits(hits)
      return if hits.empty?
      uri  = URI.parse(@config.ingest_url)
      body = JSON.generate({ hits: hits })

      http             = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl     = uri.scheme == "https"
      http.open_timeout = 3
      http.read_timeout = 5

      request = Net::HTTP::Post.new(uri.request_uri)
      request["Content-Type"]  = "application/json"
      request["Authorization"] = "Bearer #{@config.api_key}"
      request.body             = body

      http.request(request)
    rescue StandardError
      # Never raise — always silent in production
    end

    def shutdown
      @running = false
      remaining = []
      remaining << @queue.pop(true) until @queue.empty? rescue nil
      send_hits(remaining) unless remaining.empty?
    end
  end

  # ─── Rack Middleware ──────────────────────────────────────────────────────────

  class Middleware
    def initialize(app, options = {})
      @app = app
      if options.any?
        DeadRoute.configure do |c|
          c.api_key        = options[:api_key]        if options[:api_key]
          c.ingest_url     = options[:ingest_url]     if options[:ingest_url]
          c.sample_rate    = options[:sample_rate]    if options[:sample_rate]
          c.exclude        = options[:exclude]        if options[:exclude]
          c.framework      = options[:framework]      if options[:framework]
        end
      end
    end

    def call(env)
      start  = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      status, headers, body = @app.call(env)
      duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round

      request = Rack::Request.new(env)
      path    = route_path(env) || request.path

      DeadRoute.client.record(
        method:      request.request_method,
        path:        path,
        status_code: status,
        duration_ms: duration_ms,
        user_agent:  env["HTTP_USER_AGENT"],
      )

      [status, headers, body]
    end

    private

    # Prefer the Rails route pattern (e.g. /users/:id) over the raw path
    def route_path(env)
      env["action_dispatch.request.path_parameters"]&.then do
        env["action_dispatch.routes"]
          &.recognize_path(env["PATH_INFO"], method: env["REQUEST_METHOD"])
          &.then { nil }  # just fall through; Rails normalizes in rack itself
      end
      env.dig("action_dispatch.route", "path") ||
        env["sinatra.route"]&.split&.last ||
        nil
    rescue StandardError
      nil
    end
  end
end
