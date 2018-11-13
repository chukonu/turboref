package main

import (
	"database/sql"
	"fmt"
	"log"
)

func connectDb(host, database, username, password string) (*sql.DB, error) {
	connStr := fmt.Sprintf("dbname=%s host=%s user=%s password='%s' sslmode=require", database, host, username, password)
	log.Println("Connection string: " + connStr)
	return sql.Open("postgres", connStr)
}
