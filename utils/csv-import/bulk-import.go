package main

import (
	"io"

	"github.com/lib/pq"
)

func bulkImport() (count int, err error) {
	tx, err := db.Begin()
	if err != nil {
		return
	}
	stmt, err := tx.Prepare(pq.CopyIn("dyson0", "source", "translation", "note"))
	if err != nil {
		return
	}
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return count, err
		}
		count++
		_, err = stmt.Exec(record[0], record[1], record[2])
		if err != nil {
			return count, err
		}
	}
	_, err = stmt.Exec()
	if err != nil {
		return
	}
	err = stmt.Close()
	if err != nil {
		return
	}
	err = tx.Commit()
	return
}
