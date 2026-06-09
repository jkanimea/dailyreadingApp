.PHONY: help staging production seed android init clean

help:                    ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

staging:                 ## Deploy full stack to staging VPS
	./deploy.sh staging

production:              ## Deploy full stack to production VPS
	./deploy.sh production

seed:                    ## Convert raw CSVs + seed the database
	./deploy.sh seed-data

android:                 ## Build signed Android APK
	./deploy.sh build-android

init:                    ## First-time VPS setup (Podman, nginx, firewall)
	./deploy.sh init-vps

ssl:                     ## Obtain Let's Encrypt SSL certificate
	./deploy.sh ssl

build-backend:           ## Build backend container image locally
	./deploy.sh build-backend

clean:                   ## Remove all containers and volumes
	cd deploy && podman-compose down -v
