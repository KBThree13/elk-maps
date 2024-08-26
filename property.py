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
    owner = data.get('owner')
    address = data.get('address')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if owner and latitude and longitude:
        db = get_db()
        db.execute('''
            INSERT INTO properties (owner, user_id, address, latitude, longitude)
            VALUES (?, ?, ?, ?, ?)
        ''', (owner, g.user['id'], address, latitude, longitude))
        db.commit()
        return jsonify({'status': 'success'}), 201
    else:
        return jsonify({'status': 'error', 'message': 'Missing data'}), 400

# API endpoint to load all properties
@bp.route('/get_properties', methods=['GET'])
def get_properties():
    db = get_db()
    properties = db.execute('SELECT id, owner, address, latitude, longitude, user_id FROM properties').fetchall()

    properties = [{
        'id': prop['id'],
        'owner': prop['owner'],
        'address': prop['address'],
        'latitude': prop['latitude'],
        'longitude': prop['longitude'],
        'is_owner': g.user and prop['user_id'] == g.user['id']  # Check ownership
    } for prop in properties]

    return jsonify(properties)

@bp.route('/edit_property/<int:property_id>', methods=['GET', 'POST'])
@login_required
def edit_property(property_id):
    db = get_db()
    property = db.execute(
        'SELECT * FROM properties WHERE id = ? AND user_id = ?', (property_id, g.user['id'])
    ).fetchone()

    if property is None:
        return redirect(url_for('index'))  # Redirect if property is not found or the user is not the owner

    if request.method == 'POST':
        owner = request.form['owner']
        address = request.form['address']
        latitude = request.form['latitude']
        longitude = request.form['longitude']

        db.execute(
            'UPDATE properties SET owner = ?, address = ?, latitude = ?, longitude = ? WHERE id = ? AND user_id = ?',
            (owner, address, latitude, longitude, property_id, g.user['id'])
        )
        db.commit()
        return redirect(url_for('map'))

    return render_template('map/map.html', property=property)

@bp.route('/delete_property/<int:property_id>', methods=['POST'])
@login_required
def delete_property(property_id):
    db = get_db()
    db.execute(
        'DELETE FROM properties WHERE id = ? AND user_id = ?',
        (property_id, g.user['id'])
    )
    db.commit()
    return jsonify({'success': True})