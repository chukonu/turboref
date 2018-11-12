package main

// Ref is a single reference
type Ref struct {
	Rank        float32 `json:"r"`
	Source      string  `json:"s"`
	Translation string  `json:"t"`
	Note        string  `json:"n"`
}
