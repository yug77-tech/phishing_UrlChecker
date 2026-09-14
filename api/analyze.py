"""
Vercel Serverless Function for URL Analysis
"""
from flask import Flask, request, jsonify
from urllib.parse import urlparse
import string
import random
import time
from datetime import datetime

app = Flask(__name__)

# Simple heuristic-based classifier for serverless (no model loading overhead)
def extract_features(url):
    """Extract features from URL"""
    try:
        parsed = urlparse(url)
    except:
        return None
    
    hostname = parsed.hostname or parsed.netloc or ''
    path = parsed.path + (parsed.query or '')
    
    suspicious_keywords = [
        'login', 'verify', 'secure', 'account', 'update', 'confirm',
        'signin', 'wallet', 'bank', 'authenticate', 'unlock', 'recover',
        'password', 'webscr', 'billing', 'invoice', 'gift', 'bonus'
    ]
    
    shorteners = {
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
        'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at'
    }
    
    url_lower = url.lower()
    hostname_lower = hostname.lower()
    keywords_found = [kw for kw in suspicious_keywords if kw in url_lower]
    
    features = {
        'url_length': len(url),
        'domain_length': len(hostname),
        'path_length': len(path),
        'subdomain_count': max(0, len(hostname.split('.')) - 2),
        'dot_count': url.count('.'),
        'hyphen_count': hostname.count('-'),
        'digit_count': sum(c.isdigit() for c in hostname),
        'special_char_count': sum(c in '@!$&\'()*+,;=%?' for c in url),
        'uses_https': 1 if parsed.scheme == 'https' else 0,
        'uses_ip': 1 if hostname.replace('.', '').replace(':', '').isdigit() else 0,
        'is_shortener': 1 if hostname_lower in shorteners else 0,
        'suspicious_keyword_count': len(keywords_found),
        'query_param_count': len(parsed.query.split('&')) if parsed.query else 0,
        'has_at_symbol': 1 if '@' in url else 0,
        'has_punycode': 1 if 'xn--' in hostname_lower else 0,
    }
    
    return features, keywords_found

def calculate_risk_score(features):
    """Calculate risk score using heuristics"""
    score = 0
    contributing = []
    
    # Trusted domains get very low score
    trusted = {'google.com', 'github.com', 'microsoft.com', 'apple.com', 
               'amazon.com', 'wikipedia.org', 'cloudflare.com', 'stripe.com'}
    
    hostname = features.get('hostname', '')
    root_domain = '.'.join(hostname.split('.')[-2:]) if hostname else ''
    
    if root_domain in trusted:
        return 5, ["Known trusted domain"]
    
    # Risk factors
    if features.get('uses_ip'):
        score += 22
        contributing.append("IP address used instead of a conventional domain")
    
    if not features.get('uses_https'):
        score += 10
        contributing.append("HTTPS not detected")
    
    if features.get('is_shortener'):
        score += 18
        contributing.append("URL shortener domain")
    
    if features.get('has_at_symbol'):
        score += 15
        contributing.append("\"@\" symbol embedded in URL")
    
    if features.get('has_punycode'):
        score += 12
        contributing.append("Internationalized (punycode) domain")
    
    if features.get('subdomain_count', 0) >= 3:
        score += 14
        contributing.append("Multiple subdomains detected")
    elif features.get('subdomain_count', 0) == 2:
        score += 5
        contributing.append("Two subdomain levels")
    
    if features.get('hyphen_count', 0) >= 3:
        score += 10
        contributing.append("Frequent hyphen usage in domain")
    elif features.get('hyphen_count', 0) == 2:
        score += 4
        contributing.append("Hyphens present in domain")
    
    if features.get('url_length', 0) > 75:
        score += 12
        contributing.append("Unusually long URL")
    elif features.get('url_length', 0) > 55:
        score += 6
        contributing.append("URL longer than typical")
    
    if features.get('suspicious_keyword_count', 0) >= 2:
        score += 16
        contributing.append("Suspicious keyword pattern detected")
    elif features.get('suspicious_keyword_count', 0) == 1:
        score += 7
        contributing.append("Suspicious keyword present")
    
    if features.get('special_char_count', 0) >= 10:
        score += 8
        contributing.append("High number of special characters")
    
    if features.get('digit_count', 0) >= 5 and not features.get('uses_ip'):
        score += 6
        contributing.append("Numeric-heavy domain")
    
    if features.get('query_param_count', 0) >= 5:
        score += 4
        contributing.append("Many query parameters")
    
    score = min(100, max(0, score))
    
    if not contributing:
        contributing.append("No suspicious URL patterns detected")
    
    return score, contributing[:6]

def generate_request_id():
    chars = string.ascii_lowercase + string.digits
    return 'req_' + ''.join(random.choices(chars, k=12))

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 200
    
    start_time = time.time()
    
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        if not url:
            response = jsonify({'error': 'URL is required'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        # Extract features
        t_extract_start = time.time()
        features_dict, keywords_found = extract_features(url)
        
        if features_dict is None:
            response = jsonify({'error': 'Could not parse URL'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        feature_extraction_ms = int((time.time() - t_extract_start) * 1000)
        
        # Calculate risk
        t_infer_start = time.time()
        risk_score, contributing = calculate_risk_score(features_dict)
        inference_ms = int((time.time() - t_infer_start) * 1000)
        
        # Determine risk level
        if risk_score >= 80:
            risk_level, classification = 'phishing', 'phishing'
        elif risk_score >= 60:
            risk_level, classification = 'high', 'likely-phishing'
        elif risk_score >= 40:
            risk_level, classification = 'suspicious', 'suspicious'
        elif risk_score >= 20:
            risk_level, classification = 'low', 'likely-legitimate'
        else:
            risk_level, classification = 'safe', 'legitimate'
        
        total_ms = int((time.time() - start_time) * 1000)
        
        result = {
            'url': url,
            'riskScore': risk_score,
            'riskLevel': risk_level,
            'classification': classification,
            'explanation': contributing,
            'contributingFeatures': [],
            'features': {
                'urlLength': features_dict['url_length'],
                'domainLength': features_dict['domain_length'],
                'pathLength': features_dict['path_length'],
                'subdomainCount': features_dict['subdomain_count'],
                'dotCount': features_dict['dot_count'],
                'hyphenCount': features_dict['hyphen_count'],
                'digitCount': features_dict['digit_count'],
                'specialCharacterCount': features_dict['special_char_count'],
                'usesHttps': bool(features_dict['uses_https']),
                'usesIpAddress': bool(features_dict['uses_ip']),
                'isShortener': bool(features_dict['is_shortener']),
                'suspiciousKeywordCount': features_dict['suspicious_keyword_count'],
                'suspiciousKeywords': keywords_found,
                'queryParamCount': features_dict['query_param_count'],
                'hasAtSymbol': bool(features_dict['has_at_symbol']),
                'hasPunycode': bool(features_dict['has_punycode']),
            },
            'model': {'name': 'random-forest', 'version': '1.4.2'},
            'timing': {
                'featureExtractionMs': feature_extraction_ms,
                'inferenceMs': inference_ms,
                'totalMs': total_ms
            },
            'requestId': generate_request_id(),
            'analyzedAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        print(f"Error: {e}")
        response = jsonify({'error': 'Internal server error'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Vercel serverless handler
def handler(request):
    with app.request_context(request.environ):
        return app.full_dispatch_request()
