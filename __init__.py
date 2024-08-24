import os

from flask import Flask, render_template

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(SECRET_KEY='dev', DATABASE = os.path.join(app.instance_path, 'flask.sqlite'),)

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    @app.route('/maps')
    def maps():
        return render_template("map/map.html")

    @app.route('/property-form.html')
    def property_form():
        return render_template('map/property-form.html')
    
    #register the DB
    from . import db
    db.init_app(app)

    #register the auth blueprint
    from . import auth
    app.register_blueprint(auth.bp)

    #register the blog blueprint
    from . import blog
    app.register_blueprint(blog.bp)
    app.add_url_rule('/', endpoint='index')

    #register the property blueprint
    from . import property
    app.register_blueprint(property.bp)

    return app