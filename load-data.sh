for f in songs/*
do
  curl -X POST -H "Content-Type: application/json" -d "@$f" localhost:8080/songs
  echo " <- $f"
done
