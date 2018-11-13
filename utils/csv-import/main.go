package main

import (
	"database/sql"
	"encoding/csv"
	"flag"
	"log"
	"os"
)

var (
	csvReader *csv.Reader
	db        *sql.DB
)

func main() {
	csvPath := flag.String("p", "", "The path to the input file")
	dbHost := flag.String("host", "", "The host address of the database")
	dbName := flag.String("db", "", "Database")
	username := flag.String("u", "postgres", "Username")
	password := flag.String("pw", "", "Password")
	flag.Parse()

	if *csvPath == "" {
		log.Fatal("No input file")
	}
	if *dbHost == "" {
		log.Fatal("Host not specified")
	}
	if *dbName == "" {
		log.Fatal("Database not specified")
	}

	log.Printf("Input: %s\n", *csvPath)
	log.Printf("Database: %s\n", *dbHost)

	csvFile, err := os.Open(*csvPath)
	if err != nil {
		panic(err)
	}
	csvReader = csv.NewReader(csvFile)

	db, err = connectDb(*dbHost, *dbName, *username, *password)
	if err != nil {
		panic(err)
	}
	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to ping the database\n%s\n", err)
	}
	defer db.Close()

	// insertRowByRow()
	n, err := bulkImport()
	if err != nil {
		panic(err)
	}

	log.Printf("Imported %d\n", n)
}
