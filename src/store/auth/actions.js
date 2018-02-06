import { AccessToken, GraphRequest, GraphRequestManager } from 'react-native-fbsdk';
import { NavigationActions } from 'react-navigation';
import { NetInfo } from 'react-native';
import { auth } from 'kitsu/config/api';
import { kitsuConfig } from 'kitsu/config/env';
import { fetchCurrentUser } from 'kitsu/store/user/actions';
import { getAccountConflicts, setOnboardingComplete } from 'kitsu/store/onboarding/actions';
import * as types from 'kitsu/store/types';
import { isEmpty } from 'lodash';

export const refreshTokens = (forceRefresh = false) => async (dispatch, getState) => {
  const tokens = getState().auth.tokens;
  if (isEmpty(tokens)) return null;

  if (!forceRefresh) {
    // Make sure old token is expired before we refresh
    const milliseconds = (tokens.created_at + tokens.expires_in) * 1000;
    const expiredAt = new Date(milliseconds);
    const current = new Date();
    if (current < expiredAt) return tokens;

    // Check if we have a connection to the net
    // If not then we just return old tokens
    const isConnected = await NetInfo.isConnected.fetch();
    if (!isConnected) return tokens;
  }

  dispatch({ type: types.TOKEN_REFRESH });

  try {
    const newTokens = await auth.createToken(tokens).refresh();
    dispatch({ type: types.TOKEN_REFRESH_SUCCESS, payload: newTokens.data });
    return newTokens.data;
  } catch (e) {
    dispatch({ type: types.TOKEN_REFRESH_FAIL });
    throw e;
  }
};

export const loginUser = (data, nav, screen) => async (dispatch, getState) => {
  dispatch({ type: types.LOGIN_USER });
  let tokens = null;

  if (data) {
    try {
      const user = await auth.owner.getToken(data.email, data.password);
      tokens = user.data;
    } catch (e) {
      console.log(e);
    }
  } else {
    try {
      const userFb = await loginUserFb(dispatch);
      if (userFb.status !== 401) {
        tokens = await userFb.json();
      } else if (screen !== 'signup') {
        nav.dispatch(NavigationActions.navigate({ routeName: 'Signup' }));
      }
    } catch (e) {
      console.log(e);
    }
  }

  if (tokens) {
    dispatch({ type: types.LOGIN_USER_SUCCESS, payload: tokens });
    const user = await fetchCurrentUser()(dispatch, getState);
    if (screen === 'signup') {
      const onboardingAction = NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Onboarding' })],
      });
      nav.dispatch(onboardingAction);
    } else if (user.status === 'aozora') {
      await getAccountConflicts()(dispatch, getState);
      const onboardingAction = NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Onboarding' })],
      });
      nav.dispatch(onboardingAction);
    } else {
      setOnboardingComplete()(dispatch, getState);
      const loginAction = NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Tabs' })],
      });
      nav.dispatch(loginAction);
    }
  } else {
    dispatch({
      type: types.LOGIN_USER_FAIL,
      payload: 'Wrong credentials',
    });
  }
};

const loginUserFb = async (dispatch) => {
  const data = await AccessToken.getCurrentAccessToken();
  const result = await fetch(`${kitsuConfig.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'assertion',
      assertion: data.accessToken.toString(),
      provider: 'facebook',
    }),
  });
  // Create a graph request asking for user information with a callback to handle the response.
  dispatch({ type: types.GET_FBUSER });
  const infoRequest = new GraphRequest(
    '/me',
    {
      httpMethod: 'GET',
      version: 'v2.5',
      parameters: {
        fields: {
          string: 'email, name, gender',
        },
      },
    },
    (error, fbdata) => {
      dispatch({ type: types.GET_FBUSER_SUCCESS, payload: fbdata });
    },
  );
  // Start the graph request.
  new GraphRequestManager().addRequest(infoRequest).start();
  return result;
};

export const logoutUser = nav => (dispatch) => {
  dispatch({ type: types.LOGOUT_USER });
  const loginAction = NavigationActions.reset({
    index: 0,
    actions: [NavigationActions.navigate({ routeName: 'Intro' })],
    key: null,
  });
  nav.dispatch(loginAction);
};
