"""
Train a Random Forest classifier for phishing URL detection
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import json
from datetime import datetime

# Feature extraction function (matches frontend logic)
def extract_features_from_url(url):
    """Extract numerical features from a URL string"""
    from urllib.parse import urlparse
    
    try:
        parsed = urlparse(url)
    except:
        return None
    
    hostname = parsed.hostname or parsed.netloc or ''
    path = parsed.path + (parsed.query or '')
    
    # Suspicious keywords
    suspicious_keywords = [
        'login', 'verify', 'secure', 'account', 'update', 'confirm',
        'signin', 'wallet', 'bank', 'authenticate', 'unlock', 'recover',
        'password', 'webscr', 'billing', 'invoice', 'gift', 'bonus'
    ]
    
    # URL shorteners
    shorteners = {
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
        'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at'
    }
    
    url_lower = url.lower()
    hostname_lower = hostname.lower()
    
    # Calculate features
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
        'suspicious_keyword_count': sum(1 for kw in suspicious_keywords if kw in url_lower),
        'query_param_count': len(parsed.query.split('&')) if parsed.query else 0,
        'has_at_symbol': 1 if '@' in url else 0,
        'has_punycode': 1 if 'xn--' in hostname_lower else 0,
    }
    
    return features

# Generate synthetic training data (mix of phishing and legitimate URLs)
def generate_training_data():
    """Generate synthetic training dataset"""
    
    # Legitimate URL patterns
    legitimate_urls = [
        'https://www.google.com',
        'https://github.com/user/repo',
        'https://stackoverflow.com/questions',
        'https://www.amazon.com/products',
        'https://docs.python.org/3/library',
        'https://www.wikipedia.org/wiki/Article',
        'https://www.linkedin.com/in/profile',
        'https://www.youtube.com/watch',
        'https://twitter.com/user/status',
        'https://www.reddit.com/r/topic',
        'https://medium.com/@author/article',
        'https://www.microsoft.com/products',
        'https://apple.com/iphone',
        'https://www.cloudflare.com/solutions',
        'https://stripe.com/payments',
        'https://notion.so/workspace',
        'https://figma.com/file/design',
        'https://linear.app/issue',
        'https://vercel.com/dashboard',
        'https://www.npmjs.com/package/react',
    ]
    
    # Phishing URL patterns (suspicious characteristics)
    phishing_urls = [
        'http://paypal-verify-account.com/login',
        'https://secure-banking-update.net/confirm',
        'http://192.168.1.100/bank/login',
        'https://amazon-gift-bonus.tk/claim',
        'http://www.paypa1.com/signin',
        'https://app1e-id-verification.com/unlock',
        'http://bit.ly/3xyz-bank',
        'https://secure-microsoft-account-recovery.info/password',
        'http://bank-alert-verify@phishing.com/update',
        'https://xn--paypal-confirm.com/billing',
        'http://login-facebook-security.net/verify',
        'https://amazon-account-suspended.com/webscr?id=123',
        'http://secure-wallet-recovery.biz/authenticate',
        'https://netflix-payment-update.info/billing',
        'http://google-security-alert.tk/signin',
        'https://apple-icloud-locked.com/unlock?user=victim',
        'http://bank-of-america-alert.net/secure/login',
        'https://paypal-dispute-resolution.com/confirm',
        'http://instagram-verify-account.info/password',
        'https://amazon-prize-winner.com/claim?gift=1000',
    ]
    
    # Create variations to expand dataset
    data = []
    
    # Add legitimate URLs (label = 0)
    for url in legitimate_urls:
        features = extract_features_from_url(url)
        if features:
            features['label'] = 0
            features['url'] = url
            data.append(features)
            
            # Add variations
            data.append({**extract_features_from_url(url + '/page'), 'label': 0, 'url': url + '/page'})
            data.append({**extract_features_from_url(url + '?param=value'), 'label': 0, 'url': url + '?param=value'})
    
    # Add phishing URLs (label = 1)
    for url in phishing_urls:
        features = extract_features_from_url(url)
        if features:
            features['label'] = 1
            features['url'] = url
            data.append(features)
            
            # Add variations
            data.append({**extract_features_from_url(url + '?token=abc123'), 'label': 1, 'url': url + '?token=abc123'})
            data.append({**extract_features_from_url(url + '&session=xyz'), 'label': 1, 'url': url + '&session=xyz'})
    
    return pd.DataFrame(data)

def train_random_forest():
    """Train the Random Forest model"""
    
    print("🔄 Generating training data...")
    df = generate_training_data()
    
    print(f"📊 Dataset size: {len(df)} samples")
    print(f"   - Legitimate: {sum(df['label'] == 0)}")
    print(f"   - Phishing: {sum(df['label'] == 1)}")
    
    # Prepare features and labels
    feature_columns = [
        'url_length', 'domain_length', 'path_length', 'subdomain_count',
        'dot_count', 'hyphen_count', 'digit_count', 'special_char_count',
        'uses_https', 'uses_ip', 'is_shortener', 'suspicious_keyword_count',
        'query_param_count', 'has_at_symbol', 'has_punycode'
    ]
    
    X = df[feature_columns]
    y = df['label']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("\n🌲 Training Random Forest model...")
    
    # Train Random Forest
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n✅ Model trained successfully!")
    print(f"📈 Accuracy: {accuracy:.2%}")
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Phishing']))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n🔝 Top 5 Important Features:")
    print(feature_importance.head().to_string(index=False))
    
    # Save model
    model_data = {
        'model': model,
        'feature_columns': feature_columns,
        'version': '1.4.2',
        'trained_at': datetime.now().isoformat(),
        'accuracy': float(accuracy),
        'n_samples': len(df)
    }
    
    joblib.dump(model_data, 'phishing_model.pkl')
    print("\n💾 Model saved to: phishing_model.pkl")
    
    # Save feature importance as JSON
    with open('feature_importance.json', 'w') as f:
        json.dump(feature_importance.to_dict('records'), f, indent=2)
    
    return model_data

if __name__ == '__main__':
    train_random_forest()
