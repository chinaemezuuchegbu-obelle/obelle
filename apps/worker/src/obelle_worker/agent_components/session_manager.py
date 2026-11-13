"""Human-gated turn-taking and session stop state."""

class SessionManager:
    def __init__(self) -> None:
        self.paused = False
        self.stopped = False
