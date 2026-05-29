# SmartScan Pro - Flutter Backend Integration Guide

This guide explains how to integrate the Node.js backend API with your Flutter frontend application.

## Setup

### 1. Update API Configuration

Create a new service file for API communication:

**lib/services/api_service.dart**

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'storage_service.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3005/api';
  // For production: 'https://your-backend-domain.com/api'

  static Future<Map<String, dynamic>> _makeRequest(
    String method,
    String endpoint, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = {
      'Content-Type': 'application/json',
    };

    // Add JWT token if authenticated request
    if (requiresAuth) {
      final token = await StorageService.getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    try {
      late http.Response response;

      switch (method) {
        case 'GET':
          response = await http.get(url, headers: headers);
          break;
        case 'POST':
          response = await http.post(url, headers: headers, body: jsonEncode(body));
          break;
        case 'PUT':
          response = await http.put(url, headers: headers, body: jsonEncode(body));
          break;
        case 'DELETE':
          response = await http.delete(url, headers: headers);
          break;
        default:
          throw Exception('Invalid HTTP method');
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body);
      } else {
        throw Exception('API Error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Request failed: $e');
    }
  }

  // Authentication
  static Future<void> register(String name, String email, String password) async {
    final response = await _makeRequest(
      'POST',
      '/auth/register',
      body: {
        'name': name,
        'email': email,
        'password': password,
      },
      requiresAuth: false,
    );
    
    await StorageService.saveToken(response['token']);
  }

  static Future<void> login(String email, String password) async {
    final response = await _makeRequest(
      'POST',
      '/auth/login',
      body: {
        'email': email,
        'password': password,
      },
      requiresAuth: false,
    );
    
    await StorageService.saveToken(response['token']);
  }

  static Future<Map<String, dynamic>> getProfile() async {
    return await _makeRequest('GET', '/auth/profile');
  }

  static Future<void> updateProfile({String? name, double? monthlyBudget}) async {
    await _makeRequest(
      'PUT',
      '/auth/profile',
      body: {
        if (name != null) 'name': name,
        if (monthlyBudget != null) 'monthlyBudget': monthlyBudget,
      },
    );
  }

  // Receipts
  static Future<Map<String, dynamic>> analyzeReceipt(String imageData) async {
    return await _makeRequest(
      'POST',
      '/receipts/analyze',
      body: {
        'imageData': imageData, // Base64 encoded image
      },
    );
  }

  static Future<List<dynamic>> getAllReceipts({
    String? month,
    String? category,
    int skip = 0,
    int limit = 20,
  }) async {
    String query = '';
    final params = <String, String>{};
    
    if (month != null) params['month'] = month;
    if (category != null) params['category'] = category;
    params['skip'] = skip.toString();
    params['limit'] = limit.toString();

    if (params.isNotEmpty) {
      query = '?' + params.entries.map((e) => '${e.key}=${e.value}').join('&');
    }

    final response = await _makeRequest('GET', '/receipts$query');
    return response['receipts'];
  }

  static Future<void> updateReceipt(
    String id, {
    String? category,
    List<String>? tags,
    String? notes,
  }) async {
    await _makeRequest(
      'PUT',
      '/receipts/$id',
      body: {
        if (category != null) 'category': category,
        if (tags != null) 'tags': tags,
        if (notes != null) 'notes': notes,
      },
    );
  }

  static Future<void> deleteReceipt(String id) async {
    await _makeRequest('DELETE', '/receipts/$id');
  }

  // Gallery
  static Future<Map<String, dynamic>> uploadImage(String imageData) async {
    return await _makeRequest(
      'POST',
      '/gallery/upload',
      body: {
        'imageData': imageData, // Base64 encoded
      },
    );
  }

  static Future<List<dynamic>> getGalleryImages({int skip = 0, int limit = 20}) async {
    final response = await _makeRequest(
      'GET',
      '/gallery?skip=$skip&limit=$limit',
    );
    return response['images'];
  }

  static Future<void> deleteGalleryImage(String id) async {
    await _makeRequest('DELETE', '/gallery/$id');
  }

  // Budget
  static Future<Map<String, dynamic>> getBudget(String month) async {
    return await _makeRequest('GET', '/budget/$month');
  }

  static Future<void> updateBudget(String month, double budget) async {
    await _makeRequest(
      'PUT',
      '/budget/$month',
      body: {'budget': budget},
    );
  }

  static Future<Map<String, dynamic>> getSpendingBreakdown(String month) async {
    return await _makeRequest('GET', '/budget/$month/breakdown');
  }

  // Analytics
  static Future<List<dynamic>> getSpendingTrends({int months = 6}) async {
    final response = await _makeRequest('GET', '/analytics/trends?months=$months');
    return response;
  }

  static Future<Map<String, dynamic>> getCategoryInsights({String? month}) async {
    String query = month != null ? '?month=$month' : '';
    return await _makeRequest('GET', '/analytics/insights/categories$query');
  }

  static Future<List<dynamic>> getTopStores({int limit = 10, String? month}) async {
    String query = '?limit=$limit';
    if (month != null) query += '&month=$month';
    final response = await _makeRequest('GET', '/analytics/insights/top-stores$query');
    return response;
  }

  static Future<Map<String, dynamic>> getBudgetHealth({String? month}) async {
    String query = month != null ? '?month=$month' : '';
    return await _makeRequest('GET', '/analytics/insights/budget-health$query');
  }

  // Social
  static Future<void> shareReceipt(String receiptId, {String? description, String? visibility}) async {
    await _makeRequest(
      'POST',
      '/social/share',
      body: {
        'receiptId': receiptId,
        if (description != null) 'description': description,
        if (visibility != null) 'visibility': visibility,
      },
    );
  }

  static Future<List<dynamic>> getSocialFeed() async {
    final response = await _makeRequest('GET', '/social/feed');
    return response;
  }

  static Future<void> likeShare(String shareId) async {
    await _makeRequest('POST', '/social/$shareId/like');
  }

  static Future<void> commentOnShare(String shareId, String text) async {
    await _makeRequest(
      'POST',
      '/social/$shareId/comment',
      body: {'text': text},
    );
  }

  static Future<void> followUser(String userId) async {
    await _makeRequest('POST', '/social/users/$userId/follow');
  }

  static Future<Map<String, dynamic>> getUserProfile(String userId) async {
    return await _makeRequest('GET', '/social/users/$userId');
  }
}
```

### 2. Update StorageService for Token Management

Add token storage to **lib/services/storage_service.dart**:

```dart
static const String _tokenKey = 'jwt_token';

static Future<void> saveToken(String token) async {
  await _storage.write(key: _tokenKey, value: token);
}

static Future<String?> getToken() async {
  return await _storage.read(key: _tokenKey);
}

static Future<void> clearToken() async {
  await _storage.delete(key: _tokenKey);
}

static Future<bool> isLoggedIn() async {
  final token = await getToken();
  return token != null && token.isNotEmpty;
}
```

### 3. Update main.dart to Use Backend

Replace local storage calls with API calls:

```dart
import 'services/api_service.dart';

class _HomePageState extends State<HomePage> {
  // ... existing code ...

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      // Load receipts from backend
      final receiptsData = await ApiService.getAllReceipts();
      final receipts = (receiptsData as List)
          .map((r) => Receipt(
            id: r['_id'],
            storeName: r['storeName'],
            total: r['total'].toDouble(),
            date: r['date'],
          ))
          .toList();

      // Load budget
      final currentMonth = DateTime.now().toString().substring(0, 7);
      final budgetData = await ApiService.getBudget(currentMonth);

      setState(() {
        this.receipts = receipts;
        monthlyBudget = (budgetData['budget'] ?? 20000).toDouble();
      });
    } catch (e) {
      setState(() {
        analysisError = 'Failed to load data: $e';
      });
    }
  }

  Future<void> _analyzeReceipt(String imageData) async {
    setState(() => isAnalyzing = true);
    try {
      final result = await ApiService.analyzeReceipt(imageData);
      
      setState(() {
        isAnalyzing = false;
        showScanner = false;
      });

      // Receipt is already saved on backend
      _loadData();
    } catch (e) {
      setState(() {
        isAnalyzing = false;
        analysisError = 'Analysis failed: $e';
      });
    }
  }

  Future<void> _saveData() async {
    try {
      final currentMonth = DateTime.now().toString().substring(0, 7);
      await ApiService.updateBudget(currentMonth, monthlyBudget);
    } catch (e) {
      print('Error saving data: $e');
    }
  }

  void _deleteReceipt(String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        // ... dialog code ...
        onPressed: () async {
          try {
            await ApiService.deleteReceipt(id);
            _loadData();
            Navigator.pop(context);
          } catch (e) {
            setState(() => analysisError = 'Failed to delete: $e');
          }
        },
      ),
    );
  }
}
```

## Running the Integration

1. Start the backend:
```bash
cd Smartscanner-Backend
npm run dev
```

2. Update the `baseUrl` in `api_service.dart` if needed

3. Run the Flutter app:
```bash
flutter run
```

## Features Available

- ✅ User registration and login with JWT
- ✅ Receipt analysis with Gemini AI
- ✅ Cloud receipt storage
- ✅ Budget tracking and management
- ✅ Spending analytics and insights
- ✅ Gallery image management
- ✅ Social sharing and following
- ✅ Receipt categorization
- ✅ Spending trends and reports

## Error Handling

Always wrap API calls in try-catch:

```dart
try {
  await ApiService.someMethod();
} catch (e) {
  setState(() => analysisError = e.toString());
  // Show error to user
}
```

## Next Steps

1. Deploy backend to cloud (Heroku, AWS, etc.)
2. Update `baseUrl` to production URL
3. Set up HTTPS for security
4. Configure API rate limiting
5. Add push notifications for budget alerts
6. Implement image compression for uploads

## Support

For integration issues, check the backend logs or Flutter console for error messages.
