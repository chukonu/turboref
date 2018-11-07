package main

import (
	"database/sql"
	"log"
	"net/http"

	_ "github.com/lib/pq"
)

var (
	db *sql.DB
)

func main() {
	connectDB()
	defer db.Close()

	fs := http.FileServer(http.Dir("dist/turbo-ref"))
	http.Handle("/", fs)

	http.HandleFunc("/api/search", searchHandler)

	log.Println("Listening...")
	svrErr := http.ListenAndServeTLS(":3000", "certs/server.crt", "certs/server.key", nil)
	if svrErr != nil {
		log.Fatal(svrErr)
	}
}

func connectDB() {
	connStr := "host= dbname= user= password= sslmode=require"
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
}
