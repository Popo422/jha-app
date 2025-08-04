<?php
/**
 * @package JWT_Cookie_Auth
 * @version 1.0
 */
/**
 * Plugin Name: JWT Cookie Auth
 * Description: This plugin simply sets a shared cookie to support shared authentication accross other domains
 * Author: Michael Elnajami
 * Version: 1.0
*/

require_once __DIR__ . '/lib/JWT.php';
require_once __DIR__ . '/lib/Key.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Define constants for token generation.
$site_url = get_bloginfo('url');
$site_domain = parse_url($site_url, PHP_URL_HOST);
define('JWT_ISSUER', $site_url);
define('JWT_ACCESS_TOKEN_EXP', 3600); // Access token expires in 1 hour.
define('JWT_REFRESH_TOKEN_EXP', 604800); // Refresh token expires in 1 week.
define('JWT_COOKIE_PATH', '/');
define('JWT_COOKIE_DOMAIN', '.' . $site_domain);
define('JWT_SECRET_KEY', 'MdavWXTygMo9wbTCVkS2jB*Hpw#X@#GhLLpLQUyeD%Rhuvu2TPLD7g6%nAC2^RfZ');

function get_membership_data( $user_id ) {
    $membership_data = array();
    if (class_exists( 'Indeed\Ihc\UserSubscriptions')) {
        $membership_data = \Indeed\Ihc\UserSubscriptions::getAllForUser( $user_id, true );
    }
    return $membership_data;
}

/**
 * Hook into wp_login to generate and set JWT tokens.
 *
 * @param string  $user_login The user's login name.
 * @param WP_User $user       The WP_User object of the logged-in user.
 */
add_action('wp_login', 'generate_jwt_tokens_on_login', 10, 2);
function generate_jwt_tokens_on_login( $user_login, $user ) {
    $issuedAt = time();
    $accessTokenExp = $issuedAt + JWT_ACCESS_TOKEN_EXP;
    $refreshTokenExp = $issuedAt + JWT_REFRESH_TOKEN_EXP;

    $membership_data = get_membership_data( $user->ID );

    // Prepare the access token payload including membership data.
    $payload = array(
        'iss'  => JWT_ISSUER,
        'iat'  => $issuedAt,
        'exp'  => $accessTokenExp,
        'data' => array(
            'user' => array(
                'id'    => $user->ID,
                'email' => $user->user_email,
                'name'  => $user->display_name
            ),
            'membership' => array_values($membership_data)
        )
    );
    $accessToken = JWT::encode( $payload, JWT_SECRET_KEY, 'HS256' );

    // Prepare the refresh token payload (simpler, may include only the user ID).
    $refreshPayload = array(
        'iss'  => JWT_ISSUER,
        'iat'  => $issuedAt,
        'exp'  => $refreshTokenExp,
        'data' => array(
            'user' => array(
                'id'    => $user->ID,
                'email' => $user->user_email,
                'name'  => $user->display_name
            )
        )
    );
    $refreshToken = JWT::encode( $refreshPayload, JWT_SECRET_KEY, 'HS256' );

    // Set the tokens as cookies. Adjust the cookie settings as needed.
    setcookie( 'access_token', $accessToken, $accessTokenExp, JWT_COOKIE_PATH, JWT_COOKIE_DOMAIN, is_ssl(), true );
    setcookie( 'refresh_token', $refreshToken, $refreshTokenExp, JWT_COOKIE_PATH, JWT_COOKIE_DOMAIN, is_ssl(), true );

    if ( ! empty( $_REQUEST['redirect_to'] ) ) {
        // Use wp_safe_redirect to ensure only allowed URLs are used.
        wp_safe_redirect( $_REQUEST['redirect_to'] );
        exit;
    }
}

// Unset the JWT cookies on logout.
add_action( 'wp_logout', 'jwt_cookie_auth_logout' );
function jwt_cookie_auth_logout() {
    setcookie( 'access_token', '', time() - 3600, JWT_COOKIE_PATH, JWT_COOKIE_DOMAIN, is_ssl(), true );
    setcookie( 'refresh_token', '', time() - 3600, JWT_COOKIE_PATH, JWT_COOKIE_DOMAIN, is_ssl(), true );
}

/**
 * Register a REST API endpoint for refreshing the access token.
 */
add_action( 'rest_api_init', function() {
    register_rest_route( 'jwt-auth/v1', '/refresh', array(
        'methods'             => 'POST',
        'callback'            => 'handle_refresh_token',
        'permission_callback' => '__return_true',
    ));
});

/**
 * Handle the refresh token request.
 *
 * Expects the refresh token in an HTTP-only cookie.
 *
 * @param WP_REST_Request $request The REST request.
 * @return WP_REST_Response|WP_Error
 */
function handle_refresh_token( WP_REST_Request $request ) {
    // Get the refresh token from the request body.
    $parameters = $request->get_json_params();
    if ( ! isset( $parameters['refresh_token'] ) ) {
        return new WP_Error( 'no_refresh_token', 'Refresh token missing.', array( 'status' => 401 ) );
    }
    $refreshToken = sanitize_text_field( $parameters['refresh_token'] );

    try {
        // Decode the refresh token.
        $decoded = JWT::decode( $refreshToken, new Key( JWT_SECRET_KEY, 'HS256' ) );
        $user_id = $decoded->data->user->id;

        $membership_data = get_membership_data( $user_id );

        // Generate a new access token.
        $issuedAt = time();
        $accessTokenExp = $issuedAt + JWT_ACCESS_TOKEN_EXP;
        $payload = array(
            'iss'  => JWT_ISSUER,
            'iat'  => $issuedAt,
            'exp'  => $accessTokenExp,
            'data' => array(
                'user' => $decoded->data->user,
                'membership' => array_values($membership_data)
            )
        );
        $newAccessToken = JWT::encode( $payload, JWT_SECRET_KEY, 'HS256' );

        // Update the access token cookie.
        setcookie( 'access_token', $newAccessToken, $accessTokenExp, JWT_COOKIE_PATH, JWT_COOKIE_DOMAIN, is_ssl(), true );

        // Return the new access token details.
        $response = array(
            'access_token' => $newAccessToken,
            'expires_in'   => JWT_ACCESS_TOKEN_EXP
        );

        return rest_ensure_response( $response );
    } catch ( Exception $e ) {
        return new WP_Error( 'invalid_refresh_token', 'Invalid refresh token: ' . $e->getMessage(), array( 'status' => 401 ) );
    }
}

add_filter('allowed_redirect_hosts', function($hosts) {
    $hosts[] = 'dashboard.field-safe.com';
    return $hosts;
});
