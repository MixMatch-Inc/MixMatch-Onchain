from locust import HttpUser, task, between

class MixMatchFastApiUser(HttpUser):
    wait_time = between(0.1, 1.0)

    @task(5)
    def check_health(self):
        self.client.get("/health")

    @task(3)
    def query_payment_history(self):
        self.client.get("/api/payments/history?page=1&limit=20")

    @task(2)
    def query_taste_profile(self):
        self.client.get("/api/taste/profile/load-test-user-1")

    @task(1)
    def check_taste_health(self):
        self.client.get("/api/taste/health")
