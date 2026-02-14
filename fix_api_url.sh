#!/bin/bash
set -e
sed -i "s|baseURL: 'http://localhost:3001/api'|baseURL: 'http://72.62.241.170/api'|" /var/www/crystal-admin/src/lib/apiClient.ts