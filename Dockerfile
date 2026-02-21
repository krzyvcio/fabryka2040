# Use the official MariaDB image from Docker Hub
FROM mariadb:latest

# Set environment variables for MariaDB
# These are required for the initial setup of the database
# IMPORTANT: Change these to strong, unique values in production
ENV MARIADB_ROOT_PASSWORD=my_root_password
ENV MARIADB_DATABASE=neuroforge_db
ENV MARIADB_USER=neuroforge_user
ENV MARIADB_PASSWORD=neuroforge_password

# Expose the default MariaDB port
EXPOSE 3306

# The default command runs MariaDB server