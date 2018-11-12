package main

import (
	"encoding/json"
	"log"
	"net/http"
)

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
		jsonw.Encode([]interface{}{})
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

	err = jsonw.Encode(refs)
	if err != nil {
		log.Println(err)
	}
}
