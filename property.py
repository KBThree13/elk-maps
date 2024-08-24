from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for, jsonify
)

from werkzeug.exceptions import abort

from .auth import login_required
from .db import get_db

bp = Blueprint('property', __name__)

# API endpoint to save property data
@bp.route('/add_property', methods=['POST'])
@login_required
def add_property():
    data = request.json
    name = data.get('name')
    description = data.get('description')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if name and latitude and longitude:
        db = get_db()
        db.execute('''
            INSERT INTO properties (name, description, latitude, longitude)
            VALUES (?, ?, ?, ?)
        ''', (name, description, latitude, longitude))
        db.commit()
        return jsonify({'status': 'success'}), 201
    else:
        return jsonify({'status': 'error', 'message': 'Missing data'}), 400

# API endpoint to load all properties
@bp.route('/get_properties', methods=['GET'])
def get_properties():
    db = get_db()
    rows = db.execute('SELECT name, description, latitude, longitude FROM properties').fetchall()

    properties = [
        {
            'name': row[0],
            'description': row[1],
            'latitude': row[2],
            'longitude': row[3]
        }
        for row in rows
    ]

    return jsonify(properties)