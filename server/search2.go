package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

func searchHandler2(w http.ResponseWriter, r *http.Request) {
	encoder := json.NewEncoder(w)
	w.Header().Set("content-type", "application/json; charset=utf-8")

	if r.Method != http.MethodPost {
		encoder.Encode(map[string]string{"error": "invalid request method"})
		return
	}

	var sentences []string

	err := json.NewDecoder(r.Body).Decode(&sentences)

	if err != nil {
		encoder.Encode(map[string]string{"error": "error occurred while processing request.\n" + err.Error()})
		return
	}

	var refs []Ref

	for _, s := range sentences {
		rows, err := textsearch(escapeSingleQuotes(s))
		if err != nil {
			encoder.Encode(map[string]string{"error": "error occurred while searching the db.\n" + err.Error()})
			return
		}
		for rows.Next() {
			var r Ref
			err := rows.Scan(&r.Rank, &r.Source, &r.Translation, &r.Note)
			if err != nil {
				encoder.Encode(map[string]string{"error": "error occurred while processing search results.\n" + err.Error()})
				return
			}
			refs = append(refs, r)
		}
	}

	err = encoder.Encode(refs)
	if err != nil {
		http.Error(w, "error occurred while encoding search results", http.StatusInternalServerError)
	}
}

func escapeSingleQuotes(s string) string {
	return strings.Replace(s, "'", "''", -1)
}
