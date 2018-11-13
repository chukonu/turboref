package main

import (
	"database/sql"
	"io"
	"log"
)

func insertRowByRow() {
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatal(err)
		}
		err = insertRow(record[0], record[1])
		if err != nil {
			panic(err)
		}
	}
}

func insertRow(source, translation string) (err error) {
	var tx *sql.Tx
	tx, err = db.Begin()
	if err != nil {
		return
	}

	var stmt *sql.Stmt
	stmt, err = tx.Prepare("INSERT INTO dysonsample(source, translation) VALUES ($1, $2)")
	if err != nil {
		return
	}

	_, err = stmt.Exec(source, translation)
	if err != nil {
		return
	}

	tx.Commit()
	return
}
