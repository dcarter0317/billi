# 🛠️ Support & Help

Welcome to the Billi Support guide! We want to ensure your experience with the app is as smooth and secure as possible.

## 🛡️ Security & Privacy

### Biometric Lock
If you're having trouble with the Biometric Lock:
- **Enable/Disable**: Navigate to **Settings** and toggle the Biometric switch. You will be prompted to authenticate to confirm the change.
- **Device Support**: Billi uses `expo-local-authentication`. Ensure your device has FaceID, TouchID, or Android Biometrics enabled in your system settings.
- **Fallback**: If biometrics fail repeatedly, the app will request your device passcode according to your system's security policies.

### Data Privacy
All your data is currently stored **locally** on your device using encrypted `SecureStore` for preferences and application state. No sensitive financial data leaves your device.

## 📊 Troubleshooting

### App Stuck on Lock Screen
If the app doesn't show the biometric prompt:
1. Ensure the app has permission to use Biometrics in your OS settings.
2. Restart the app.
3. If issues persist, the screen will provide a "Retry" or fallback mechanism.

### Budget Analysis Not Updating
The Budget screen calculates totals based on all bills in your list. If figures look incorrect:
- Ensure you have entered the correct numerical values in the **Amount** field for each bill.
- Check that each bill has an assigned **Category**.

## 📞 Get in Touch

If you encounter bugs or have feature suggestions:
- **GitHub Issues**: Report bugs via our GitHub repository issues page.
- **Feature Requests**: We'd love to hear how we can make Billi better for your financial journey!

---
*Billi - Simplify your finances.*
