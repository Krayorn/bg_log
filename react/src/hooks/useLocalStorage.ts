
import { useState } from "react";

export const parseJwt = (token: string) => {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

export const useLocalStorage = (keyName, defaultValue) => {
    const [storedValue, setStoredValue] = useState(() => {
      try {
        const value = window.localStorage.getItem(keyName)
  
        if (value) {
          return JSON.parse(value)
        } else {
          window.localStorage.setItem(keyName, JSON.stringify(defaultValue))
          return defaultValue
        }
      } catch (err) {
        return defaultValue
      }
    })
  
    const setValue = (newValue) => {
      try {
        window.localStorage.setItem(keyName, JSON.stringify(newValue))
      } catch (err) {}
      setStoredValue(newValue)
    }
  
    return [storedValue, setValue]
  }
  