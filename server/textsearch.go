package main

import (
	"database/sql"
	"fmt"
)

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
