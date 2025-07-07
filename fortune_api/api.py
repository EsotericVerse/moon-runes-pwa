from flask import Flask, request, jsonify
from flask_cors import CORS
from fortune_engine import generate_fortune

app = Flask(__name__)
CORS(app, origins=["https://esotericverse.github.io"])  # 允許 GitHub Pages 來源

@app.route("/api/fortune", methods=["POST"])
def get_fortune():
    data = request.get_json()
    card_name = data.get("card_name")
    direction_index = data.get("direction_index")
    moon_index = data.get("moon_index")

    try:
        result = generate_fortune(card_name, direction_index, moon_index)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=10000)
