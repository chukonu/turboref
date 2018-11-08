package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"net/http"

	_ "github.com/lib/pq"
)

var (
	db *sql.DB

	dbname string
	dbhost string
	dbuser string
	dbpsw  string
)

func main() {
	flag.StringVar(&dbname, "db", "", "Database name")
	flag.StringVar(&dbhost, "host", "localhost", "Database host address")
	flag.StringVar(&dbuser, "usr", "postgres", "Database user name")
	flag.StringVar(&dbpsw, "psw", "", "Database password")
	flag.Parse()

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
	connStr := fmt.Sprintf("host=%s dbname=%s user=%s password=%s sslmode=require", dbhost, dbname, dbuser, dbpsw)
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
}
