package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// Ref is a single reference
type Ref struct {
	Rank        float32 `json:"r"`
	Source      string  `json:"s"`
	Translation string  `json:"t"`
	Note        string  `json:"n"`
}

// SearchResponse is data returned from the API
type SearchResponse struct {
	Refs []Ref `json:"r"`
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
	jsonw := json.NewEncoder(w)

	if r.Method != http.MethodGet {
		jsonw.Encode(map[string]string{"error": "must use GET"})
		return
	}

	err := r.ParseForm()
	if err != nil {
		jsonw.Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("content-type", "application/json; charset=utf-8")

	q := r.FormValue("q")
	if q == "" {
		jsonw.Encode(&SearchResponse{nil})
		return
	}

	rows, err := textsearch(q)
	if err != nil {
		jsonw.Encode(map[string]string{"error": err.Error()})
		return
	}

	var refs []Ref
	for rows.Next() {
		var (
			rank   float32
			source string
			trnsln string
			note   string
		)
		err := rows.Scan(&rank, &source, &trnsln, &note)
		if err != nil {
			jsonw.Encode(map[string]string{"error": err.Error()})
			return
		}
		ref := Ref{rank, source, trnsln, note}
		refs = append(refs, ref)
	}

	err = jsonw.Encode(&SearchResponse{refs})
	if err != nil {
		log.Println(err)
	}
}

func textsearch(text string) (rows *sql.Rows, err error) {
	if text == "" {
		return
	}
	query := `
SELECT
	ts_rank_cd(src, query) AS rank,
	source,
	translation,
	note
FROM
	dyson0,
	to_tsvector(source) src,
	plainto_tsquery('%s') query
WHERE
		src @@ query
ORDER BY rank DESC
LIMIT 20`
	rows, err = db.Query(fmt.Sprintf(query, text))
	return
}
